/**
 * Community / Membership / Location / Tag / Invite — Zod バリデーションスキーマ
 */
import { z } from 'zod/v4'

// ── Location (Community スキーマから参照されるため先に定義) ──

const locationItemSchema = z.object({
    type: z.enum(['MAIN', 'SUB']),
    area: z.string().min(1, '活動エリアは必須です').max(100),
    station: z.string().max(100).optional(),
})

// ── Community ──

/** POST /v1/communities */
export const createCommunitySchema = z.object({
    name: z.string().min(1, 'コミュニティ名は必須です').max(100),
    description: z.string().max(2000).optional(),
    joinMethod: z.enum(['FREE_JOIN', 'APPROVAL', 'INVITATION']).optional(),
    isPublic: z.boolean().optional(),
    maxMembers: z.number().int().min(1).max(10000).optional(),
    activityFrequency: z.string().max(100).optional(),
    targetGender: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).max(130).optional(),
    ageMax: z.number().int().min(0).max(130).optional(),
    recommendedLevelMin: z.number().int().min(0).max(8).optional(),
    recommendedLevelMax: z.number().int().min(0).max(8).optional(),
    categoryIds: z.array(z.string().min(1)).min(1, 'カテゴリは必須です'),
    activityDays: z.array(z.string()).optional(),
    tags: z.array(z.string().max(30)).max(20).optional(),
    locations: z.array(locationItemSchema).max(10).optional(),
})

/** PATCH /v1/communities/:id */
export const updateCommunitySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().url().nullable().optional(),
    coverUrl: z.string().url().nullable().optional(),
    payPayId: z.string().max(100).nullable().optional(),
    enabledPaymentMethods: z.array(z.string()).optional(),
    joinMethod: z.enum(['FREE_JOIN', 'APPROVAL', 'INVITATION']).optional(),
    isPublic: z.boolean().optional(),
    activityFrequency: z.string().max(100).nullable().optional(),
    targetGender: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).max(130).nullable().optional(),
    ageMax: z.number().int().min(0).max(130).nullable().optional(),
    categoryIds: z.array(z.string().min(1)).min(1, 'カテゴリは必須です').optional(),
    recommendedLevelMin: z.number().int().min(0).max(8).nullable().optional(),
    recommendedLevelMax: z.number().int().min(0).max(8).nullable().optional(),
    tags: z.array(z.string().max(30)).max(20).optional(),
    locations: z.array(locationItemSchema).max(10).optional(),
})

/** POST /v1/communities/:parentId/children */
export const createSubCommunitySchema = z.object({
    name: z.string().min(1, 'コミュニティ名は必須です').max(100),
    description: z.string().max(2000).optional(),
    /** 親の設定を全て引き継ぐ */
    inheritSettings: z.boolean().optional().default(true),
    /** メンバー引き継ぎ方式 */
    memberInheritance: z.enum(['ALL', 'SELECT', 'OWNER_ONLY', 'ADMIN_AND_ABOVE']).optional().default('ADMIN_AND_ABOVE'),
    /** SELECT 時の選択メンバーID */
    selectedMemberIds: z.array(z.string().uuid()).optional(),
    // --- 入力し直す場合の設定フィールド ---
    joinMethod: z.enum(['FREE_JOIN', 'APPROVAL', 'INVITATION']).optional(),
    isPublic: z.boolean().optional(),
    maxMembers: z.number().int().min(1).nullable().optional(),
    targetGender: z.array(z.string()).optional(),
    ageMin: z.number().int().min(0).nullable().optional(),
    ageMax: z.number().int().min(0).nullable().optional(),
    activityFrequency: z.string().max(100).nullable().optional(),
    activityDays: z.array(z.string()).optional(),
    categoryIds: z.array(z.string().min(1)).nullable().optional(),
    recommendedLevelMin: z.number().int().min(0).max(8).nullable().optional(),
    recommendedLevelMax: z.number().int().min(0).max(8).nullable().optional(),
    tags: z.array(z.string().max(50)).optional(),
})

// ── Membership ──

/** POST /v1/communities/:id/members */
export const addMemberSchema = z.object({
    userId: z.string().uuid('ユーザーIDは必須です'),
})

/** PATCH /v1/communities/:id/members/:memberId/role */
export const changeMemberRoleSchema = z.object({
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
    /** W4-05: ADMIN ロール変更を子コミュニティにも伝播するか */
    propagateToChildren: z.boolean().optional(),
})

/** PATCH /v1/communities/:id/members/:userId/level */
export const updateMembershipLevelSchema = z.object({
    /** 0〜8 の整数。null でクリア */
    level: z.number().int().min(0).max(8).nullable(),
})

/** POST /v1/communities/:id/join-request */
export const joinRequestSchema = z.object({
    message: z.string().max(500).optional(),
})

// ── Location ──

/** PUT /v1/communities/:id/locations */
export const saveLocationsSchema = z.object({
    locations: z.array(locationItemSchema).min(1).max(10),
})

/** POST /v1/communities/:id/locations */
export const addLocationSchema = locationItemSchema

// ── Tag ──

/** PUT /v1/communities/:id/tags */
export const saveTagsSchema = z.object({
    tags: z.array(z.string().max(30)).max(20),
})

// ── Webhook Config ──

/** PUT /v1/communities/:communityId/webhooks */
export const saveWebhookConfigSchema = z.object({
    service: z.string().min(1),
    webhookUrl: z.string().url('有効なURLを入力してください'),
    enabled: z.boolean().optional(),
})
