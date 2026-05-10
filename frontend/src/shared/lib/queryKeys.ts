/**
 * Query Key ユーティリティ
 *
 * queryKey は配列で階層化し、invalidateQueries の粒度制御に使う。
 *
 * ルール:
 *   - queryKey は配列で階層化する
 *   - params はオブジェクトをそのまま入れず、固定順の配列を使う
 *
 * @example
 * const userKeys = makeResourceKeys('users')
 * userKeys.all        // ['users']
 * userKeys.list(1)    // ['users', 'list', 1]
 * userKeys.detail(42) // ['users', 'detail', 42]
 */
export const makeResourceKeys = (name: string) => ({
    all: [name] as const,
    list: (...parts: (string | number | boolean)[]) =>
        [name, 'list', ...parts] as const,
    detail: (id: string | number) => [name, 'detail', id] as const,
})

// ─── 認証ドメイン用 Key ──────────────────────────────────

export const authKeys = {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
}

// ─── User ドメイン用 Key ────────────────────────────────

export const userKeys = {
    all: ['users'] as const,
    profile: () => ['users', 'profile'] as const,
}

// ─── Community ドメイン用 Key ────────────────────────────

export const communityKeys = makeResourceKeys('communities')

export const subCommunityKeys = {
    all: ['sub-communities'] as const,
    list: (parentId: string) => ['sub-communities', 'list', parentId] as const,
}

export const communityBookmarkKeys = {
    all: ['community-bookmarks'] as const,
}

export const communitySearchKeys = {
    all: ['communities', 'search'] as const,
    list: (params: Record<string, unknown>) => ['communities', 'search', params] as const,
    publicDetail: (id: string) => ['communities', 'public', id] as const,
}

export const memberKeys = {
    all: ['members'] as const,
    list: (communityId: string) => ['members', 'list', communityId] as const,
}

export const auditLogKeys = {
    all: ['audit-logs'] as const,
    byCommunity: (communityId: string) => ['audit-logs', communityId] as const,
}

export const masterKeys = {
    all: ['masters'] as const,
    community: () => ['masters', 'community'] as const,
}

// ─── Activity ドメイン用 Key ─────────────────────────────

export const activityKeys = makeResourceKeys('activities')

export const activityListKeys = {
    byCommunity: (communityId: string) => ['activities', 'list', communityId] as const,
}

// ─── Schedule ドメイン用 Key ─────────────────────────────

export const scheduleKeys = makeResourceKeys('schedules')

export const scheduleListKeys = {
    byActivity: (activityId: string) => ['schedules', 'list', activityId] as const,
    byUser: (from: string, to: string) => ['schedules', 'list', 'user', from, to] as const,
}

// ─── Announcement ドメイン用 Key ─────────────────────────

export const announcementKeys = makeResourceKeys('announcements')

export const announcementListKeys = {
    all: ['announcements', 'list'] as const,
    byCommunity: (communityId: string) => ['announcements', 'list', communityId] as const,
}

export const announcementFeedKeys = {
    all: ['announcements', 'feed'] as const,
}

// ─── Chat ドメイン用 Key ─────────────────────────────────

export const chatKeys = makeResourceKeys('chat')

export const chatChannelKeys = {
    byCommunity: (communityId: string) => ['chat', 'channel', 'community', communityId] as const,
    byActivity: (activityId: string) => ['chat', 'channel', 'activity', activityId] as const,
    myChannels: () => ['chat', 'channels', 'me'] as const,
}

export const messageKeys = makeResourceKeys('messages')

export const messageListKeys = {
    byChannel: (channelId: string) => ['messages', 'list', channelId] as const,
    replies: (messageId: string) => ['messages', 'replies', messageId] as const,
    search: (channelId: string, query: string) => ['messages', 'search', channelId, query] as const,
}

// ─── DM ドメイン用 Key ──────────────────────────────────

export const dmKeys = makeResourceKeys('dm')

export const dmListKeys = {
    myChannels: () => ['dm', 'list'] as const,
}

// ─── Stamp ドメイン用 Key ───────────────────────────────

export const stampKeys = makeResourceKeys('stamps')

// ─── Notification ドメイン用 Key ────────────────────────

export const notificationKeys = makeResourceKeys('notifications')

export const notificationUnreadKeys = {
    count: () => ['notifications', 'unread-count'] as const,
}

// ─── Participation ドメイン用 Key ────────────────────────

export const participationListKeys = {
    bySchedule: (scheduleId: string) => ['participations', 'list', scheduleId] as const,
}

export const participationHistoryKeys = {
    bySchedule: (scheduleId: string) => ['participations', 'history', scheduleId] as const,
}

export const waitlistKeys = {
    bySchedule: (scheduleId: string) => ['waitlist', 'list', scheduleId] as const,
}

export const refundPendingKeys = {
    bySchedule: (scheduleId: string) => ['refund-pending', 'schedule', scheduleId] as const,
    byCommunity: (communityId: string) => ['refund-pending', 'community', communityId] as const,
}

export const paymentHistoryKeys = {
    byCommunity: (communityId: string) => ['payment-history', 'community', communityId] as const,
}

// ─── Matching ドメイン用 Key (Wave6 Phase10) ─────────────

export const matchingKeys = {
    bySchedule: (scheduleId: string) => ['matching', 'schedule', scheduleId] as const,
}

// ─── Announcement Social Key ────────────────────────────

export const announcementCommentKeys = {
    byAnnouncement: (announcementId: string) => ['announcements', 'comments', announcementId] as const,
}

export const announcementSearchKeys = {
    query: (keyword: string) => ['announcements', 'search', keyword] as const,
}

// ─── Album ドメイン用 Key ────────────────────────────────

export const albumKeys = makeResourceKeys('albums')

export const albumListKeys = {
    byCommunity: (communityId: string) => ['albums', 'list', communityId] as const,
}

export const albumPhotoKeys = {
    byAlbum: (albumId: string) => ['albums', 'photos', albumId] as const,
}

// ─── Analytics ドメイン用 Key (Phase 4) ─────────────────

export const analyticsKeys = {
    stats: (communityId: string) => ['analytics', 'stats', communityId] as const,
    trend: (communityId: string) => ['analytics', 'trend', communityId] as const,
    absences: (communityId: string) => ['analytics', 'absences', communityId] as const,
}

// ─── Poll ドメイン用 Key (UBL-34) ───────────────────────

export const pollKeys = makeResourceKeys('polls')

export const pollListKeys = {
    byCommunity: (communityId: string) => ['polls', 'list', communityId] as const,
}

// ─── Webhook ドメイン用 Key (UBL-29) ────────────────────

export const webhookKeys = {
    byCommunity: (communityId: string) => ['webhooks', 'list', communityId] as const,
}

// ─── Expense / Finance ドメイン用 Key ───────────────────

export const expenseCategoryKeys = {
    byCommunity: (communityId: string) => ['expense-categories', 'list', communityId] as const,
}

export const expenseKeys = {
    byCommunity: (communityId: string, from?: string, to?: string) =>
        from || to
            ? (['expenses', 'list', communityId, from ?? '', to ?? ''] as const)
            : (['expenses', 'list', communityId] as const),
}

export const financeSummaryKeys = {
    byCommunity: (communityId: string, from?: string, to?: string) =>
        ['finance', 'summary', communityId, from ?? '', to ?? ''] as const,
}

export const incomeKeys = {
    byCommunity: (communityId: string, from?: string, to?: string) =>
        ['finance', 'income', communityId, from ?? '', to ?? ''] as const,
}

export const activityIncomeDetailKeys = {
    byActivity: (communityId: string, activityId: string, from?: string, to?: string) =>
        ['finance', 'income', 'detail', communityId, activityId, from ?? '', to ?? ''] as const,
}
