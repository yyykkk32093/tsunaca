/**
 * API レスポンス型定義
 * バックエンドの DTO に対応するフロントエンド側の型
 */

// ============================================================
// Auth
// ============================================================

/** POST /v1/auth/password — リクエスト */
export interface PasswordLoginRequest {
    email: string
    password: string
}

/** POST /v1/auth/password — レスポンス */
export interface PasswordLoginResponse {
    userId: string
    accessToken?: string  // httpOnly Cookie方式では省略されうる
}

/** POST /v1/auth/oauth/:provider — リクエスト */
export interface OAuthLoginRequest {
    code: string
    redirectUri?: string
}

/** POST /v1/auth/oauth/:provider — レスポンス */
export interface OAuthLoginResponse {
    userId: string
    accessToken?: string
}

export type OAuthProvider = 'google' | 'line' | 'apple'

/** POST /v1/auth/logout — レスポンス */
export interface LogoutResponse {
    message: string
}

/** GET /v1/auth/me — レスポンス */
export interface AuthMeResponse {
    userId: string
    plan: 'FREE' | 'LITE' | 'PRO' | 'LIFETIME'
    displayName: string | null
    email: string
    avatarUrl: string | null
    /** Wave6 Phase 8-A: プラットフォーム（運営側）権限 */
    systemRole: 'USER' | 'OPERATOR' | 'SUPER_ADMIN'
    features: Record<string, boolean>
    limits: Record<string, number>
}

// ============================================================
// User
// ============================================================

/** POST /v1/users — リクエスト */
export interface SignUpRequest {
    email: string
    password: string
    displayName?: string
}

/** POST /v1/users — レスポンス */
export interface SignUpResponse {
    userId: string
}

// ============================================================
// Error — ApiError は src/shared/lib/apiClient.ts で定義・export
// HttpError.api の型として統一。ここでは再定義しない
// ============================================================

// ============================================================
// Community
// ============================================================

/** POST /v1/communities — リクエスト */
export interface CreateCommunityRequest {
    name: string
    description?: string
    joinMethod?: 'FREE_JOIN' | 'APPROVAL' | 'INVITATION'
    isPublic?: boolean
    maxMembers?: number
    activityFrequency?: string
    targetGender?: string[]
    ageMin?: number
    ageMax?: number
    categoryIds: string[]
    recommendedLevelMin?: number
    recommendedLevelMax?: number
    activityDays?: string[]
    tags?: string[]
    locations?: Array<{ type: 'MAIN' | 'SUB'; area: string; station?: string }>
}

/** POST /v1/communities — レスポンス */
export interface CreateCommunityResponse {
    communityId: string
}

/** GET /v1/communities — レスポンス */
export interface ListCommunitiesResponse {
    communities: CommunityListItem[]
}

export interface CommunityListItem {
    id: string
    parentId: string | null
    name: string
    description: string | null
    logoUrl: string | null
    coverUrl: string | null
    grade: string
    role: string
    createdBy: string
    joinMethod: string
    isPublic: boolean
    maxMembers: number | null
    latestAnnouncementTitle: string | null
    latestAnnouncementAt: string | null
    bookmarked: boolean
}

/** GET /v1/communities/:id — レスポンス */
export interface CommunityDetail {
    id: string
    parentId: string | null
    name: string
    description: string | null
    logoUrl: string | null
    coverUrl: string | null
    grade: string
    createdBy: string
    joinMethod: string
    isPublic: boolean
    maxMembers: number | null
    activityFrequency: string | null
    targetGender: string[]
    ageMin: number | null
    ageMax: number | null
    recommendedLevelMin: number | null
    recommendedLevelMax: number | null
    categories: Array<{ id: string; name: string; nameEn: string }>
    participationLevels: Array<{ id: string; name: string; nameEn: string }>
    activityDays: string[]
    tags: string[]
    memberCount: number
    payPayId?: string | null
    enabledPaymentMethods?: string[]
    /** 活動拠点（MAIN/SUB） */
    locations?: Array<{
        id: string
        type: 'MAIN' | 'SUB'
        area: string
        station: string | null
        sortOrder: number
    }>
}

/** PATCH /v1/communities/:id — リクエスト */
export interface UpdateCommunityRequest {
    name?: string
    description?: string
    logoUrl?: string | null
    coverUrl?: string | null
    payPayId?: string | null
    enabledPaymentMethods?: string[]
    joinMethod?: 'FREE_JOIN' | 'APPROVAL' | 'INVITATION'
    isPublic?: boolean
    activityFrequency?: string | null
    targetGender?: string[]
    ageMin?: number | null
    ageMax?: number | null
    categoryIds?: string[]
    recommendedLevelMin?: number | null
    recommendedLevelMax?: number | null
    tags?: string[]
    locations?: Array<{ type: 'MAIN' | 'SUB'; area: string; station?: string }>
}

/** POST /v1/communities/:parentId/children — リクエスト */
export interface CreateSubCommunityRequest {
    name: string
    description?: string
    /** 親の設定を全て引き継ぐ */
    inheritSettings?: boolean
    /** メンバー引き継ぎ方式 */
    memberInheritance?: 'ALL' | 'SELECT' | 'OWNER_ONLY' | 'ADMIN_AND_ABOVE'
    /** SELECT 時の選択メンバーID */
    selectedMemberIds?: string[]
    // --- 入力し直す場合の設定 ---
    joinMethod?: 'FREE_JOIN' | 'APPROVAL' | 'INVITATION'
    isPublic?: boolean
    maxMembers?: number
    targetGender?: string[]
    ageMin?: number
    ageMax?: number
    activityFrequency?: string
    activityDays?: string[]
    recommendedLevelMin?: number
    recommendedLevelMax?: number
    categoryIds?: string[]
    tags?: string[]
}

/** GET /v1/communities/:id/children — サブコミュニティ一覧行
 *  W6-01: CommunityCard で一覧表示できるよう CommunityListItem 互換として返す。
 */
export interface SubCommunityListItem {
    id: string
    parentId: string | null
    name: string
    description: string | null
    logoUrl: string | null
    memberCount: number
    latestAnnouncementTitle: string | null
    latestAnnouncementAt: string | null
    bookmarked: boolean
}

export interface ListSubCommunitiesResponse {
    children: SubCommunityListItem[]
}

// ============================================================
// Membership
// ============================================================

export interface Member {
    id: string
    userId: string
    role: string
    joinedAt: string
    displayName: string | null
    avatarUrl: string | null
    /** コミュニティ内レベル（0～8）。未設定は null */
    level: number | null
}

export interface ListMembersResponse {
    members: Member[]
}

// ============================================================
// Community Audit Log (UBL-10)
// ============================================================

export interface AuditLogEntry {
    id: string
    actorUserId: string
    actorDisplayName: string | null
    action: string
    field: string | null
    before: string | null
    after: string | null
    summary: string
    createdAt: string
}

export interface ListAuditLogsResponse {
    logs: AuditLogEntry[]
}

// ============================================================
// Invite Token (UBL-11)
// ============================================================

export interface GenerateInviteTokenResponse {
    token: string
    expiresAt: string
}

export interface AcceptInviteResponse {
    communityId: string
    membershipId: string
}

// ============================================================
// User Profile (UBL-32)
// ============================================================

export interface UserProfile {
    id: string
    displayName: string | null
    email: string | null
    phone: string | null
    biography: string | null
    avatarUrl: string | null
    plan: string
}

export interface UpdateUserProfileRequest {
    displayName?: string | null
    avatarUrl?: string | null
    biography?: string | null
}

export interface AddMemberRequest {
    userId: string
}

export interface ChangeMemberRoleRequest {
    role: string
}

// ============================================================
// Master Data
// ============================================================

export interface MasterItem {
    id: string
    name: string
    nameEn: string
    sortOrder: number
}

export interface CommunityMastersResponse {
    categories: MasterItem[]
    participationLevels: MasterItem[]
}

// ============================================================
// Community — Search & Join (Phase 2.5)
// ============================================================

/** GET /v1/communities/search — クエリパラメータ */
export interface SearchCommunitiesParams {
    keyword?: string
    categoryIds?: string[]
    levelIds?: string[]
    area?: string
    days?: string[]
    /** W4-03: 対象性別フィルタ */
    targetGender?: string[]
    /** W4-03: 参加方法 (OPEN / APPROVAL / INVITE_ONLY) */
    joinMethod?: string
    limit?: number
    offset?: number
}

/** GET /v1/communities/search — レスポンス */
export interface SearchCommunitiesResponse {
    communities: PublicCommunitySearchItem[]
    total: number
}

export interface PublicCommunitySearchItem {
    id: string
    name: string
    description: string | null
    logoUrl: string | null
    joinMethod: string
    memberCount: number
    categories: Array<{ id: string; name: string }>
    participationLevels: Array<{ id: string; name: string }>
    /** W4-03 */
    targetGender: string[]
    ageMin: number | null
    ageMax: number | null
    activityFrequency: string | null
}

/** POST /v1/communities/:id/join — レスポンス */
export interface JoinCommunityResponse {
    membershipId: string
}

/** POST /v1/communities/:id/join-request — リクエスト */
export interface JoinRequestBody {
    message?: string
}

/** POST /v1/communities/:id/join-request — レスポンス */
export interface JoinRequestResponse {
    joinRequestId: string
}

// ============================================================
// Activity
// ============================================================

export interface CreateActivityRequest {
    title: string
    description?: string | null
    defaultPlaceId?: string | null
    defaultLocationCustom?: string | null
    defaultStartTime?: string | null
    defaultEndTime?: string | null
    recurrenceRule?: string | null
    organizerUserId?: string | null
    date?: string | null
    participationFee?: number
    visitorFee?: number | null
    isOnline?: boolean
    meetingUrl?: string | null
    capacity?: number | null
    shouldPostAnnouncement?: boolean  // Phase3 #4
    allowVisitorWaitlist?: boolean
    visibility?: 'PUBLIC' | 'PRIVATE'
    recurrenceGenerationMonths?: number | null
}

export interface CreateActivityResponse {
    activityId: string
    scheduleId?: string
}

export interface ListActivitiesResponse {
    activities: ActivityListItem[]
}

export interface ActivityListItem {
    id: string
    communityId: string
    communityName: string | null
    title: string
    description: string | null
    defaultPlaceId: string | null
    defaultLocationCustom: string | null
    isOnline: boolean
    /** Place マスタ選択時の詳細情報（lat/lng で Maps リンク、address で住所表示）
     * FindActivity レスポンスのみ embed。ListActivities では undefined。 */
    defaultPlace?: {
        id: string
        name: string
        address: string
        lat: number
        lng: number
    } | null
    defaultStartTime: string | null
    defaultEndTime: string | null
    organizerUserId: string | null
    createdBy: string
    createdByDisplayName: string | null
    upcomingSchedules: Array<{
        id: string
        date: string
        startTime: string
        endTime: string
    }>
}

export interface ActivityDetail extends ActivityListItem {
    defaultParticipationFee: number | null
    defaultVisitorFee: number | null
    defaultCapacity: number | null
    allowVisitorWaitlist: boolean
    visibility: 'PUBLIC' | 'PRIVATE'
    recurrenceRule: string | null
    organizerDisplayName: string | null
    deleted: boolean
    communityPaymentSettings: {
        enabledPaymentMethods: string[]
        paypayId: string | null
        stripeAccountId: string | null
    }
}

export interface UpdateActivityRequest {
    title?: string
    description?: string | null
    defaultPlaceId?: string | null
    defaultLocationCustom?: string | null
    isOnline?: boolean
    defaultStartTime?: string | null
    defaultEndTime?: string | null
    recurrenceRule?: string | null
    organizerUserId?: string | null
    defaultParticipationFee?: number | null
    defaultVisitorFee?: number | null
    defaultCapacity?: number | null
    allowVisitorWaitlist?: boolean
    visibility?: 'PUBLIC' | 'PRIVATE'
    recurrenceGenerationMonths?: number | null
}

export interface ChangeOrganizerRequest {
    organizerUserId?: string | null
}

// ============================================================
// Place (W6-07)
// ============================================================

/** GET /v1/places/search — レスポンス項目 */
export interface PlaceSearchItem {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    category: string | null
    usageCount: number
}

// ============================================================
// Schedule
// ============================================================

export interface CreateScheduleRequest {
    date: string
    startTime: string
    endTime: string
    location?: string | null
    note?: string | null
    capacity?: number | null
    participationFee?: number
    visitorFee?: number | null
    isOnline?: boolean
    meetingUrl?: string | null
}

export interface CreateScheduleResponse {
    scheduleId: string
}

export interface ListSchedulesResponse {
    schedules: ScheduleListItem[]
}

export interface ScheduleListItem {
    id: string
    activityId: string
    communityId: string
    date: string
    startTime: string
    endTime: string
    location: string | null
    note: string | null
    status: string
    capacity: number | null
    participationFee: number
    visitorFee: number | null
    isOnline: boolean
    meetingUrl: string | null
    participantCount?: number
    /** Wave6 W6-08: 決済が紐付くスケジュールだと復元不可 */
    hasPayments?: boolean
    myStatus?: 'none' | 'attending' | 'waitlisted'
    myParticipationId?: string | null
    myPaymentMethod?: string | null
    myPaymentStatus?: string | null
    attendingCount?: number
    waitlistCount?: number
    enabledPaymentMethods?: string[]
    paypayId?: string | null
}

export interface UpdateScheduleRequest {
    date?: string
    startTime?: string
    endTime?: string
    location?: string | null
    note?: string | null
    capacity?: number | null
    participationFee?: number
    visitorFee?: number | null
    isOnline?: boolean
    meetingUrl?: string | null
}

// ============================================================
// User Schedule (横断取得)
// ============================================================

export interface UserScheduleItem {
    scheduleId: string
    date: string
    startTime: string
    endTime: string
    location: string | null
    status: string
    participationFee: number
    visitorFee: number | null
    isOnline: boolean
    meetingUrl: string | null
    activityId: string
    activityTitle: string
    communityId: string
    communityName: string
    organizerName?: string | null
    participantCount?: number
    capacity?: number | null
}

export interface ListUserSchedulesResponse {
    schedules: UserScheduleItem[]
}

// ============================================================
// Participation / Waitlist
// ============================================================

export interface AttendScheduleRequest {
    isVisitor?: boolean
    paymentMethod?: string | null
}

export interface AttendScheduleResponse {
    participationId: string
}

export interface JoinWaitlistResponse {
    waitlistEntryId: string
}

export interface ParticipantItem {
    id: string
    userId: string | null
    displayName: string | null
    visitorName: string | null
    addedBy: string | null
    status: string
    isVisitor: boolean
    respondedAt: string
    paymentMethod: string | null
    paymentStatus: string | null
}

export interface ListParticipantsResponse {
    participants: ParticipantItem[]
}

export interface WaitlistItem {
    id: string
    userId: string
    displayName: string | null
    isVisitor: boolean
    visitorName: string | null
    position: number
    status: string
    registeredAt: string
}

export interface ListWaitlistResponse {
    entries: WaitlistItem[]
}

/** 4-4: 参加履歴（直近キャンセル情報） */
export interface GetParticipationHistoryResponse {
    hasPaidCancellation: boolean
    paymentMethod: string | null
    paymentStatus: string | null
    cancelledAt: string | null
}

// ---- 返金管理 ----

export interface RefundPendingPaymentItem {
    paymentId: string
    scheduleId: string
    userId: string
    displayName: string | null
    paymentMethod: string
    amount: number
    feeAmount: number
    createdAt: string
    updatedAt: string
    activityTitle: string | null
    scheduleDate: string | null
    scheduleStartTime: string | null
    paymentNumber: number
}

export interface ListRefundPendingResponse {
    payments: RefundPendingPaymentItem[]
}

export interface ResolvedPaymentItem {
    paymentId: string
    scheduleId: string
    userId: string
    displayName: string | null
    paymentMethod: string
    amount: number
    feeAmount: number
    status: string // 'REFUNDED' | 'NO_REFUND'
    createdAt: string
    updatedAt: string
    activityTitle: string | null
    scheduleDate: string | null
    scheduleStartTime: string | null
    paymentNumber: number
}

export interface ListPaymentHistoryResponse {
    payments: ResolvedPaymentItem[]
}

// ============================================================
// Announcement
// ============================================================

export interface CreateAnnouncementRequest {
    title: string
    content: string
    attachments?: Array<{
        fileUrl: string
        fileName: string
        mimeType: string
        fileSize: number
    }>
}

export interface CreateAnnouncementResponse {
    announcementId: string
}

export interface ListAnnouncementsResponse {
    announcements: AnnouncementListItem[]
}

export interface AnnouncementListItem {
    id: string
    communityId: string
    activityId: string | null
    authorId: string
    authorName: string | null
    authorAvatarUrl: string | null
    communityName: string
    communityLogoUrl: string | null
    title: string
    content: string
    isRead: boolean
    isBookmarked: boolean
    createdAt: string
    likeCount: number
    commentCount: number
    isLiked: boolean
    readCount: number
    attachments: Array<{ id: string; fileUrl: string; mimeType: string }>
    scheduleInfo: { scheduleId: string; date: string; startTime: string; endTime: string; scheduleStatus: string } | null
    activityDeleted: boolean
}

export interface AnnouncementDetail {
    id: string
    communityId: string
    activityId: string | null
    authorId: string
    authorName: string | null
    authorAvatarUrl: string | null
    communityName: string
    title: string
    content: string
    createdAt: string
    isRead: boolean
    isLiked: boolean
    isBookmarked: boolean
    likeCount: number
    commentCount: number
    readCount: number
    attachments: Array<{ id: string; fileUrl: string; mimeType: string }>
    scheduleInfo: { scheduleId: string; date: string; startTime: string; endTime: string; scheduleStatus: string } | null
    activityDeleted: boolean
}

export interface AnnouncementFeedItem {
    id: string
    communityId: string
    activityId: string | null
    authorId: string
    authorName: string | null
    authorAvatarUrl: string | null
    communityName: string
    communityLogoUrl: string | null
    title: string
    content: string
    isRead: boolean
    isBookmarked: boolean
    createdAt: string
    likeCount: number
    commentCount: number
    isLiked: boolean
    readCount: number
    attachments: Array<{ id: string; fileUrl: string; mimeType: string }>
    scheduleInfo: { scheduleId: string; date: string; startTime: string; endTime: string; scheduleStatus: string } | null
    activityDeleted: boolean
}

export interface AnnouncementFeedResponse {
    items: AnnouncementFeedItem[]
    nextCursor: string | null
}

export interface ToggleBookmarkResponse {
    bookmarked: boolean
}

export interface UpdateAnnouncementRequest {
    title: string
    content: string
}

export interface UpdateAnnouncementResponse {
    id: string
}

// ============================================================
// Chat Channel / Message
// ============================================================

export interface ChatChannel {
    channelId: string
    type: 'COMMUNITY' | 'ACTIVITY' | 'DM'
    communityId?: string | null
    activityId?: string | null
    createdAt: string
}

export interface MessageAttachment {
    id: string
    fileUrl: string
    fileName: string
    mimeType: string
    fileSize: number
}

export interface MessageReactionSummary {
    stampId: string | null
    emoji: string | null
    stampImageUrl: string | null
    count: number
    reacted: boolean
}

export interface MessageItem {
    id: string
    channelId: string
    senderId: string
    senderDisplayName: string | null
    senderAvatarUrl: string | null
    content: string
    mentions: unknown
    parentMessageId: string | null
    deletedBy: string | null
    attachments: MessageAttachment[]
    reactions: MessageReactionSummary[]
    replyCount: number
    latestReply: { senderDisplayName: string | null; content: string; createdAt: string } | null
    createdAt: string
}

export interface ListMessagesResponse {
    messages: MessageItem[]
    nextCursor: string | null
}

export interface SearchMessagesResponse {
    messages: MessageItem[]
    nextCursor: string | null
    query: string
}

export interface SendMessageRequest {
    content: string
    mentions?: string[]
    parentMessageId?: string
}

export interface SendMessageResponse {
    messageId: string
}

// ============================================================
// My Channels (GET /v1/channels)
// ============================================================

export interface MyChannelLastMessage {
    id: string
    senderId: string
    content: string
    createdAt: string
}

export interface MyCommunityChannel {
    channelId: string
    type: 'COMMUNITY'
    name: string
    avatarUrl: string | null
    communityId: string | null
    lastMessage: MyChannelLastMessage | null
}

export interface MyActivityChannel {
    channelId: string
    type: 'ACTIVITY'
    name: string
    subtitle: string
    communityName: string
    /** W4-08: コミュニティIDを追加（アクティビティパスのネスト用） */
    communityId: string | null
    activityId: string | null
    scheduleDate: string | null
    scheduleStartTime: string | null
    scheduleEndTime: string | null
    lastMessage: MyChannelLastMessage | null
}

export interface MyDMChannel {
    channelId: string
    type: 'DM'
    participants: string[]
    lastMessage: MyChannelLastMessage | null
}

export interface MyChannelsResponse {
    community: MyCommunityChannel[]
    activity: MyActivityChannel[]
    dm: MyDMChannel[]
}

// ============================================================
// W5-25: Community Channel Tree (unread management)
// ============================================================

export interface TreeLastMessage {
    id: string
    senderId: string
    content: string
    createdAt: string
}

export interface ActivityTreeNode {
    activityId: string
    name: string
    channelId: string | null
    unreadCount: number
    scheduleDate: string | null
    scheduleStartTime: string | null
    scheduleEndTime: string | null
    lastMessage: TreeLastMessage | null
}

export interface CommunityTreeNode {
    communityId: string
    name: string
    logoUrl: string | null
    channelId: string | null
    unreadCount: number
    lastMessage: TreeLastMessage | null
    children: CommunityTreeNode[]
}

export interface ActivityCommunityTreeNode {
    communityId: string
    communityName: string
    communityLogoUrl: string | null
    activities: ActivityTreeNode[]
    children: ActivityCommunityTreeNode[]
    unreadCount: number
}

export interface DMTreeItem {
    channelId: string
    participants: string[]
    unreadCount: number
    lastMessage: TreeLastMessage | null
}

export interface CommunityChannelTreeResponse {
    communities: CommunityTreeNode[]
    activityTree: ActivityCommunityTreeNode[]
    dm: DMTreeItem[]
}

// ============================================================
// DM
// ============================================================

export interface DMChannelItem {
    channelId: string
    participants: string[]
    lastMessage: {
        id: string
        senderId: string
        content: string
        createdAt: string
    } | null
}

export interface ListDMChannelsResponse {
    channels: DMChannelItem[]
}

export interface CreateDMRequest {
    participantIds: string[]
}

export interface CreateDMResponse {
    channelId: string
    type: 'DM'
    participants: string[]
}

// ============================================================
// Stamp
// ============================================================

export interface StampItem {
    id: string
    createdByUserId: string
    name: string
    imageUrl: string
    createdAt: string
}

export interface ListStampsResponse {
    stamps: StampItem[]
}

export interface CreateStampRequest {
    name: string
    imageUrl: string
}

// ============================================================
// Notification
// ============================================================

export interface NotificationItem {
    id: string
    type: string
    title: string
    body: string | null
    referenceId: string | null
    referenceType: string | null
    metadata: Record<string, unknown> | null
    isRead: boolean
    createdAt: string
}

export interface ListNotificationsResponse {
    notifications: NotificationItem[]
    nextCursor: string | null
}

export interface UnreadCountResponse {
    unreadCount: number
}

// ============================================================
// クレジットカード決済
// ============================================================

/** クレジットカード PaymentIntent 作成レスポンス（繰り上げ参加者用） */
export interface CreateCreditCardPaymentIntentResponse {
    clientSecret: string
    paymentIntentId: string
    totalAmount: number
    platformFee: number
    baseFee: number
}

// ============================================================
// UBL-1: Announcement Like
// ============================================================

export interface ToggleLikeResponse {
    liked: boolean
    likeCount: number
}

// ============================================================
// UBL-2: Announcement Comment
// ============================================================

export interface CreateCommentRequest {
    content: string
}

export interface CreateCommentResponse {
    commentId: string
}

export interface CommentItem {
    id: string
    announcementId: string
    userId: string
    userName: string | null
    userAvatarUrl: string | null
    content: string
    createdAt: string
}

export interface ListCommentsResponse {
    comments: CommentItem[]
    nextCursor: string | null
}

// ============================================================
// UBL-4: Announcement Search
// ============================================================

export interface SearchAnnouncementsResponse {
    items: AnnouncementFeedItem[]
}

// ============================================================
// UBL-6: Album
// ============================================================

export interface CreateAlbumRequest {
    title: string
    description?: string
}

export interface CreateAlbumResponse {
    albumId: string
}

export interface AlbumItem {
    id: string
    communityId: string
    title: string
    description: string | null
    createdBy: string
    createdAt: string
    photoCount: number
    coverUrl: string | null
}

export interface ListAlbumsResponse {
    albums: AlbumItem[]
}

export interface AddAlbumPhotoRequest {
    fileUrl: string
    fileName: string
    mimeType: string
    fileSize: number
}

export interface AddAlbumPhotoResponse {
    photoId: string
}

export interface AlbumPhotoItem {
    id: string
    albumId: string
    fileUrl: string
    fileName: string
    mimeType: string
    fileSize: number
    uploadedBy: string
    createdAt: string
}

export interface ListAlbumPhotosResponse {
    photos: AlbumPhotoItem[]
}

// ============================================================
// Analytics — Phase 4 (UBL-17〜22)
// ============================================================

/** UBL-17: GET /v1/communities/:communityId/analytics/stats */
export interface ActivityStatsItem {
    activityId: string
    activityTitle: string
    totalSchedules: number
    totalAttending: number
    totalCancelled: number
    attendanceRate: number
}

export interface MonthlyStatsItem {
    month: string
    totalSchedules: number
    totalAttending: number
    attendanceRate: number
}

export interface CommunityStatsResponse {
    communityId: string
    totalMembers: number
    totalActivities: number
    totalSchedules: number
    totalParticipations: number
    overallAttendanceRate: number
    byActivity: ActivityStatsItem[]
    byMonth: MonthlyStatsItem[]
}

/** UBL-19: GET /v1/communities/:communityId/analytics/trend */
export interface TrendPointItem {
    month: string
    uniqueParticipants: number
    totalAttendances: number
    newParticipants: number
}

export interface ParticipationTrendResponse {
    communityId: string
    trend: TrendPointItem[]
}

/** UBL-18: GET /v1/communities/:communityId/analytics/absences */
export interface AbsenceItem {
    participationId: string
    scheduleId: string
    activityTitle: string
    scheduleDate: string
    userId: string
    displayName: string | null
    cancelledAt: string
    isSameDayCancel: boolean
}

export interface AbsenceSummaryData {
    totalCancellations: number
    sameDayCancellations: number
    frequentCancellers: Array<{
        userId: string
        displayName: string | null
        cancelCount: number
        sameDayCancelCount: number
    }>
}

export interface AbsenceReportResponse {
    communityId: string
    summary: AbsenceSummaryData
    items: AbsenceItem[]
}

// ============================================================
// Visitor
// ============================================================

export interface AddVisitorRequest {
    visitorName: string
    paymentMethod?: string | null
}

export interface AddVisitorResponse {
    participationId: string
    waitlisted: boolean
}

export interface UpdateVisitorPaymentRequest {
    paymentMethod: string
    paymentStatus?: string
}

// ============================================================
// Expense / Finance
// ============================================================

export interface ExpenseCategory {
    id: string
    name: string
    isSystem: boolean
    sortOrder: number
    isActive: boolean
}

export interface ListExpenseCategoriesResponse {
    categories: ExpenseCategory[]
}

export interface ExpenseItem {
    id: string
    categoryId: string
    categoryName: string
    amount: number
    description: string | null
    date: string
    createdBy: string
    createdAt: string
}

export interface ListExpensesResponse {
    expenses: ExpenseItem[]
}

export interface CreateExpenseRequest {
    categoryId: string
    amount: number
    description?: string | null
    date: string
}

export interface FinanceSummaryResponse {
    totalExpense: number
    expensesByCategory: Array<{
        categoryId: string
        categoryName: string
        total: number
    }>
}

export interface CommunityIncomeResponse {
    totalIncome: number
    incomeByActivity: Array<{
        activityId: string
        activityTitle: string
        total: number
    }>
}

export interface ActivityIncomeDetailResponse {
    schedules: Array<{
        scheduleId: string
        label: string
        total: number
        payments: Array<{
            displayName: string | null
            amount: number
            isVisitor: boolean
            isGuest: boolean
        }>
    }>
}

/** ルートコミュニティ用: サブコミュニティ含む収支ツリー */
export interface FinanceSummaryTreeResponse {
    communities: Array<{
        communityId: string
        communityName: string
        income: number
        expense: number
        balance: number
    }>
    totals: {
        income: number
        expense: number
        balance: number
    }
}

export interface CreateExpenseCategoryRequest {
    name: string
}

export interface UpdateExpenseCategoryRequest {
    name: string
}

