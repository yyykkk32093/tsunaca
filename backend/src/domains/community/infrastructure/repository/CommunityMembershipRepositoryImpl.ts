import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import type { Prisma, PrismaClient, CommunityMembership as PrismaMembership } from '@prisma/client'
import { CommunityId } from '../../domain/model/valueObject/CommunityId.js'
import { CommunityMembership } from '../../membership/domain/model/entity/CommunityMembership.js'
import { MembershipId } from '../../membership/domain/model/valueObject/MembershipId.js'
import { MembershipRole } from '../../membership/domain/model/valueObject/MembershipRole.js'
import type { ICommunityMembershipRepository } from '../../membership/domain/repository/ICommunityMembershipRepository.js'

type PrismaClientLike = PrismaClient | Prisma.TransactionClient

export class CommunityMembershipRepositoryImpl implements ICommunityMembershipRepository {
    constructor(private readonly prisma: PrismaClientLike) { }

    async findById(id: string): Promise<CommunityMembership | null> {
        const row = await this.prisma.communityMembership.findUnique({ where: { id } })
        return row ? this.toDomain(row) : null
    }

    async findByCommunityAndUser(communityId: string, userId: string): Promise<CommunityMembership | null> {
        const row = await this.prisma.communityMembership.findUnique({
            where: { communityId_userId: { communityId, userId } },
        })
        return row ? this.toDomain(row) : null
    }

    async findsByCommunityId(communityId: string): Promise<CommunityMembership[]> {
        const rows = await this.prisma.communityMembership.findMany({
            where: { communityId, leftAt: null },
            orderBy: { joinedAt: 'asc' },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async findsByUserId(userId: string): Promise<CommunityMembership[]> {
        const rows = await this.prisma.communityMembership.findMany({
            where: { userId, leftAt: null },
            orderBy: { joinedAt: 'desc' },
        })
        return rows.map((r) => this.toDomain(r))
    }

    async save(membership: CommunityMembership): Promise<void> {
        await this.prisma.communityMembership.upsert({
            where: { id: membership.getId().getValue() },
            create: {
                id: membership.getId().getValue(),
                communityId: membership.getCommunityId().getValue(),
                userId: membership.getUserId().getValue(),
                role: membership.getRole().getValue(),
                joinedAt: membership.getJoinedAt(),
                leftAt: membership.getLeftAt(),
                level: membership.getLevel(),
            },
            update: {
                role: membership.getRole().getValue(),
                leftAt: membership.getLeftAt(),
                level: membership.getLevel(),
            },
        })
    }

    private toDomain(row: PrismaMembership): CommunityMembership {
        return CommunityMembership.reconstruct({
            id: MembershipId.reconstruct(row.id),
            communityId: CommunityId.reconstruct(row.communityId),
            userId: UserId.create(row.userId),
            role: MembershipRole.reconstruct(row.role),
            joinedAt: row.joinedAt,
            leftAt: row.leftAt,
            level: row.level,
        })
    }
}
