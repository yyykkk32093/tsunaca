import type { IDMChannelRepository } from '@/domains/chat/domain/repository/IDMChannelRepository.js'
import type { Prisma } from '@prisma/client'

type PrismaLike = Pick<
    Prisma.TransactionClient,
    'communityMembership' | 'chatChannel' | 'community' | 'channelReadState' | 'message' | 'schedule'
>

/** ツリーノード: コミュニティ（ルート or 子） */
interface CommunityTreeNode {
    communityId: string
    name: string
    logoUrl: string | null
    channelId: string | null
    unreadCount: number
    lastMessage: {
        id: string
        senderId: string
        content: string
        createdAt: string
    } | null
    children: CommunityTreeNode[]
}

/** アクティビティツリー: コミュニティ親子構造付き */
interface ActivityCommunityTreeNode {
    communityId: string
    communityName: string
    communityLogoUrl: string | null
    activities: ActivityTreeNode[]
    children: ActivityCommunityTreeNode[]
    unreadCount: number
}

/** ツリーノード: アクティビティ */
interface ActivityTreeNode {
    activityId: string
    name: string
    channelId: string | null
    unreadCount: number
    scheduleDate: string | null
    scheduleStartTime: string | null
    scheduleEndTime: string | null
    lastMessage: {
        id: string
        senderId: string
        content: string
        createdAt: string
    } | null
}

/** DM チャンネル項目 */
interface DMTreeItem {
    channelId: string
    participants: string[]
    unreadCount: number
    lastMessage: {
        id: string
        senderId: string
        content: string
        createdAt: string
    } | null
}

export interface CommunityTreeResult {
    communities: CommunityTreeNode[]
    activityTree: ActivityCommunityTreeNode[]
    dm: DMTreeItem[]
}

/**
 * チャットコミュニティツリー UseCase
 *
 * 参加コミュニティを親子構造で返し、各ノードにチャンネルID・未読数・最新メッセージを含む。
 */
export class GetCommunityChannelTreeUseCase {
    constructor(
        private readonly db: PrismaLike,
        private readonly dmChannelRepo: IDMChannelRepository,
    ) { }

    async execute(userId: string): Promise<CommunityTreeResult> {
        // 1. 参加コミュニティ取得
        const memberships = await this.db.communityMembership.findMany({
            where: { userId, leftAt: null },
            select: { communityId: true },
        })
        const communityIds = memberships.map((m) => m.communityId)
        if (communityIds.length === 0) {
            const dmItems = await this.buildDMItems(userId)
            return { communities: [], activityTree: [], dm: dmItems }
        }

        // 2. コミュニティ情報（親子含む）
        const communities = await this.db.community.findMany({
            where: { id: { in: communityIds }, deletedAt: null },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                parentId: true,
                activities: {
                    where: { deletedAt: null },
                    select: { id: true, title: true },
                },
            },
        })

        // 3. 関連チャンネル（コミュニティ+アクティビティ）
        const activityIds = communities.flatMap((c) => c.activities.map((a) => a.id))
        const channels = await this.db.chatChannel.findMany({
            where: {
                OR: [
                    { type: 'COMMUNITY', communityId: { in: communityIds } },
                    ...(activityIds.length > 0
                        ? [{ type: 'ACTIVITY', activityId: { in: activityIds } }]
                        : []),
                ],
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    where: { parentMessageId: null },
                },
            },
        })

        const channelByCommunityId = new Map<string, (typeof channels)[0]>()
        const channelByActivityId = new Map<string, (typeof channels)[0]>()
        for (const ch of channels) {
            if (ch.communityId) channelByCommunityId.set(ch.communityId, ch)
            if (ch.activityId) channelByActivityId.set(ch.activityId, ch)
        }

        // 4. 既読状態
        const allChannelIds = channels.map((ch) => ch.id)
        const readStates = allChannelIds.length > 0
            ? await this.db.channelReadState.findMany({
                where: { userId, channelId: { in: allChannelIds } },
            })
            : []
        const readMap = new Map(readStates.map((rs) => [rs.channelId, rs.lastReadAt]))

        // 5. 未読数を各チャンネルで計算
        const unreadCounts = new Map<string, number>()
        for (const ch of channels) {
            const lastRead = readMap.get(ch.id)
            const count = lastRead
                ? await this.db.message.count({
                    where: {
                        channelId: ch.id,
                        parentMessageId: null,
                        createdAt: { gt: lastRead },
                    },
                })
                : await this.db.message.count({
                    where: { channelId: ch.id, parentMessageId: null },
                })
            unreadCounts.set(ch.id, count)
        }

        // 6. スケジュール情報
        const scheduleMap = new Map<string, { date: string; startTime: string; endTime: string }>()
        if (activityIds.length > 0) {
            const now = new Date()
            const schedules = await this.db.schedule.findMany({
                where: { activityId: { in: activityIds } },
                select: { activityId: true, date: true, startTime: true, endTime: true },
                orderBy: { date: 'asc' },
            })
            const grouped = new Map<string, typeof schedules>()
            for (const s of schedules) {
                const arr = grouped.get(s.activityId) ?? []
                arr.push(s)
                grouped.set(s.activityId, arr)
            }
            for (const [actId, items] of grouped) {
                const future = items.find((s) => s.date >= now)
                const picked = future ?? items[items.length - 1]
                if (picked) {
                    scheduleMap.set(actId, {
                        date: picked.date.toISOString().slice(0, 10),
                        startTime: picked.startTime,
                        endTime: picked.endTime,
                    })
                }
            }
        }

        // 7. ツリー構築
        const communityMap = new Map(communities.map((c) => [c.id, c]))

        const buildActivityNodes = (acts: { id: string; title: string }[]): ActivityTreeNode[] =>
            acts.map((a) => {
                const ch = channelByActivityId.get(a.id)
                const sched = scheduleMap.get(a.id)
                const msg = ch?.messages[0]
                return {
                    activityId: a.id,
                    name: a.title,
                    channelId: ch?.id ?? null,
                    unreadCount: ch ? (unreadCounts.get(ch.id) ?? 0) : 0,
                    scheduleDate: sched?.date ?? null,
                    scheduleStartTime: sched?.startTime ?? null,
                    scheduleEndTime: sched?.endTime ?? null,
                    lastMessage: msg
                        ? { id: msg.id, senderId: msg.senderId, content: msg.content, createdAt: msg.createdAt.toISOString() }
                        : null,
                }
            })

        const buildNode = (c: (typeof communities)[0], childCommunities: typeof communities): CommunityTreeNode => {
            const ch = channelByCommunityId.get(c.id)
            const msg = ch?.messages[0]
            const children = childCommunities
                .filter((cc) => cc.parentId === c.id)
                .map((cc) => buildNode(cc, []))
            return {
                communityId: c.id,
                name: c.name,
                logoUrl: c.logoUrl ?? null,
                channelId: ch?.id ?? null,
                unreadCount: ch ? (unreadCounts.get(ch.id) ?? 0) : 0,
                lastMessage: msg
                    ? { id: msg.id, senderId: msg.senderId, content: msg.content, createdAt: msg.createdAt.toISOString() }
                    : null,
                children,
            }
        }

        // ルートコミュニティ（parentId が null、または parent が参加リストにない）
        const rootCommunities = communities.filter(
            (c) => !c.parentId || !communityIds.includes(c.parentId),
        )
        const childCommunities = communities.filter(
            (c) => c.parentId && communityIds.includes(c.parentId),
        )

        const tree = rootCommunities.map((c) => buildNode(c, childCommunities))

        // 子の未読数を親に集約（コミュニティチャンネルのみ）
        const aggregateUnread = (node: CommunityTreeNode): number => {
            let total = node.unreadCount
            for (const child of node.children) {
                total += aggregateUnread(child)
            }
            node.unreadCount = total
            return total
        }
        tree.forEach(aggregateUnread)

        // 8. アクティビティをコミュニティツリー構造で構築
        const activityNodeMap = new Map<string, ActivityCommunityTreeNode>()
        for (const c of communities) {
            activityNodeMap.set(c.id, {
                communityId: c.id,
                communityName: c.name,
                communityLogoUrl: c.logoUrl ?? null,
                activities: buildActivityNodes(c.activities),
                children: [],
                unreadCount: 0,
            })
        }
        // 親子関係を構築
        for (const c of communities) {
            if (c.parentId && activityNodeMap.has(c.parentId)) {
                activityNodeMap.get(c.parentId)!.children.push(activityNodeMap.get(c.id)!)
            }
        }
        // 未読数集約（自身のactivities + 子のunreadCount）
        const aggregateActivityUnread = (node: ActivityCommunityTreeNode): number => {
            let total = node.activities.reduce((sum, a) => sum + a.unreadCount, 0)
            for (const child of node.children) {
                total += aggregateActivityUnread(child)
            }
            node.unreadCount = total
            return total
        }
        // ルートノード抽出（アクティビティ or 子が存在するノードのみ）
        const activityRoots = communities
            .filter((c) => !c.parentId || !communityIds.includes(c.parentId))
            .map((c) => activityNodeMap.get(c.id)!)
        activityRoots.forEach(aggregateActivityUnread)
        // アクティビティが一つもないノードを再帰的に除外
        const pruneEmpty = (node: ActivityCommunityTreeNode): ActivityCommunityTreeNode | null => {
            const prunedChildren = node.children
                .map(pruneEmpty)
                .filter((n): n is ActivityCommunityTreeNode => n !== null)
            if (node.activities.length === 0 && prunedChildren.length === 0) return null
            return { ...node, children: prunedChildren }
        }
        const activityTree = activityRoots
            .map(pruneEmpty)
            .filter((n): n is ActivityCommunityTreeNode => n !== null)

        // 9. DM
        const dmItems = await this.buildDMItems(userId)

        return { communities: tree, activityTree, dm: dmItems }
    }

    private async buildDMItems(userId: string): Promise<DMTreeItem[]> {
        const dmChannels = await this.dmChannelRepo.listByUserId(userId)

        const dmChannelIds = dmChannels.map((d) => d.channelId)
        const dmReadStates = dmChannelIds.length > 0
            ? await this.db.channelReadState.findMany({
                where: { userId, channelId: { in: dmChannelIds } },
            })
            : []
        const dmReadMap = new Map(dmReadStates.map((rs) => [rs.channelId, rs.lastReadAt]))

        const items: DMTreeItem[] = []
        for (const d of dmChannels) {
            const lastRead = dmReadMap.get(d.channelId)
            const unreadCount = lastRead
                ? await this.db.message.count({
                    where: { channelId: d.channelId, parentMessageId: null, createdAt: { gt: lastRead } },
                })
                : await this.db.message.count({
                    where: { channelId: d.channelId, parentMessageId: null },
                })

            items.push({
                channelId: d.channelId,
                participants: d.participants,
                unreadCount,
                lastMessage: d.lastMessage
                    ? {
                        id: d.lastMessage.id,
                        senderId: d.lastMessage.senderId,
                        content: d.lastMessage.content,
                        createdAt: d.lastMessage.createdAt.toISOString(),
                    }
                    : null,
            })
        }

        return items.sort((a, b) => {
            const ta = a.lastMessage?.createdAt ?? ''
            const tb = b.lastMessage?.createdAt ?? ''
            return tb.localeCompare(ta)
        })
    }
}
