import { IUnitOfWorkWithRepos } from '@/application/_sharedApplication/uow/IUnitOfWork.js'
import { CommunityAuditLog } from '@/domains/community/auditLog/domain/model/entity/CommunityAuditLog.js'
import type { ICommunityAuditLogRepository } from '@/domains/community/auditLog/domain/repository/ICommunityAuditLogRepository.js'
import type { ICommunityMembershipRepository } from '@/domains/community/membership/domain/repository/ICommunityMembershipRepository.js'
import { CommunityPermissionError } from '../error/CommunityPermissionError.js'
import { MembershipNotFoundError } from '../error/MembershipNotFoundError.js'

export type UpdateMemberLevelTxRepositories = {
    membership: ICommunityMembershipRepository
    auditLog: ICommunityAuditLogRepository
}

/**
 * メンバーのコミュニティ内レベル変更ユースケース。
 * - ADMIN / OWNER のみ実行可能
 * - 対象は OWNER 含む全メンバー
 */
export class UpdateMemberLevelUseCase {
    constructor(
        private readonly unitOfWork: IUnitOfWorkWithRepos<UpdateMemberLevelTxRepositories>,
    ) { }

    async execute(input: {
        communityId: string
        targetUserId: string
        requesterId: string
        newLevel: number | null
    }): Promise<void> {
        await this.unitOfWork.run(async (repos) => {
            const requester = await repos.membership.findByCommunityAndUser(
                input.communityId, input.requesterId,
            )
            if (!requester || !requester.isActive() ||
                (!requester.getRole().isOwner() && !requester.getRole().isAdmin())) {
                throw new CommunityPermissionError('レベル変更は管理者以上のみ実行できます')
            }

            const target = await repos.membership.findByCommunityAndUser(
                input.communityId, input.targetUserId,
            )
            if (!target || !target.isActive()) {
                throw new MembershipNotFoundError()
            }

            const oldLevel = target.getLevel()
            target.changeLevel(input.newLevel)
            await repos.membership.save(target)

            await repos.auditLog.save(new CommunityAuditLog({
                communityId: input.communityId,
                actorUserId: input.requesterId,
                action: 'MEMBER_LEVEL_CHANGED',
                field: 'level',
                before: oldLevel != null ? String(oldLevel) : null,
                after: input.newLevel != null ? String(input.newLevel) : null,
                summary: `メンバーのレベルを変更しました`,
            }))
        })
    }
}
