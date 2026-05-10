-- ============================================================
-- FeatureGate Seed Data
-- Based on memo.md §5 — プラン × ロール 制限マトリクス
-- ============================================================
-- 実行: env $(grep -v '^#' env/.env.local | xargs) psql $DATABASE_URL -f infra/database/seeds/feature-gate-seed.sql

-- ============================================================
-- 1. UserFeatureRestriction — ユーザープラン × 機能ON/OFF
-- ============================================================

-- DM新規開始
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'DM_CREATE', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'DM_CREATE', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'DM_CREATE', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- チャット検索
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'CHAT_SEARCH', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'CHAT_SEARCH', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'CHAT_SEARCH', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ファイル/写真添付
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'FILE_ATTACHMENT', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'FILE_ATTACHMENT', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'FILE_ATTACHMENT', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ピン留め・ブックマーク
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'PIN_BOOKMARK', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'PIN_BOOKMARK', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'PIN_BOOKMARK', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 外部カレンダーエクスポート
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'CALENDAR_EXPORT', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'CALENDAR_EXPORT', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'CALENDAR_EXPORT', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 外部通知連携（Slack/LINE/Discord）
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'EXTERNAL_NOTIFICATION', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'EXTERNAL_NOTIFICATION', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'EXTERNAL_NOTIFICATION', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 広告非表示
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'AD_FREE', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'AD_FREE', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'AD_FREE', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- カスタムスタンプ作成
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'CUSTOM_STAMP', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'CUSTOM_STAMP', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'CUSTOM_STAMP', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ---- LITE プラン（FREE と同一だが AD_FREE のみ true）----
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'DM_CREATE', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'CHAT_SEARCH', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'FILE_ATTACHMENT', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'PIN_BOOKMARK', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'CALENDAR_EXPORT', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'EXTERNAL_NOTIFICATION', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'AD_FREE', true, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();
INSERT INTO "UserFeatureRestriction" ("id","plan","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'CUSTOM_STAMP', false, NOW(), NOW())
ON CONFLICT ("plan","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ============================================================
-- 2. UserLimitRestriction — ユーザープラン × 数量上限
-- ============================================================
-- value = -1 は無制限を意味する

-- 参加コミュニティ数上限
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxJoinCommunities', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'maxJoinCommunities', -1, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'maxJoinCommunities', -1, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- ルートコミュニティ作成上限
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxRootCommunities', 1, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'maxRootCommunities', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'maxRootCommunities', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- サブコミュニティ作成上限（OWNER時）
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxSubCommunities', 3, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'maxSubCommunities', 10, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'maxSubCommunities', 10, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- カスタムスタンプ登録上限
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxCustomStamps', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PRO', 'maxCustomStamps', 100, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LIFETIME', 'maxCustomStamps', 100, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- ---- LITE プラン数量上限（FREE と同一）----
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'maxJoinCommunities', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'maxRootCommunities', 1, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'maxSubCommunities', 3, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
INSERT INTO "UserLimitRestriction" ("id","plan","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'LITE', 'maxCustomStamps', 5, NOW(), NOW())
ON CONFLICT ("plan","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- ============================================================
-- 3. CommunityFeatureRestriction — コミュニティグレード × 機能ON/OFF
-- ============================================================

-- 副管理者（ADMIN）設定
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'ADMIN_ROLE', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'ADMIN_ROLE', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- コミュニティカスタマイズ（ロゴ・カバー画像）
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'COMMUNITY_CUSTOMIZATION', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'COMMUNITY_CUSTOMIZATION', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 参加費の決済受付
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'PAID_SCHEDULE', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'PAID_SCHEDULE', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 定例Schedule自動生成
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'AUTO_SCHEDULE', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'AUTO_SCHEDULE', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 支払い催促・支払い状態可視化
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'PAYMENT_VISIBILITY', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'PAYMENT_VISIBILITY', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 参加状況CSV出力
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'CSV_EXPORT', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'CSV_EXPORT', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 会計情報出力
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'ACCOUNTING_EXPORT', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'ACCOUNTING_EXPORT', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ビジター/登録参加者の色分け
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'VISITOR_HIGHLIGHT', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'VISITOR_HIGHLIGHT', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 一括リマインド
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'BULK_REMIND', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'BULK_REMIND', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- 参加率レポート
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'ANALYTICS_REPORT', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'ANALYTICS_REPORT', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- AI連携
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'AI_INTEGRATION', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'AI_INTEGRATION', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- マッチング（組み合わせ）生成・確認
INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'MATCHING', false, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

INSERT INTO "CommunityFeatureRestriction" ("id","grade","feature","enabled","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'MATCHING', true, NOW(), NOW())
ON CONFLICT ("grade","feature") DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW();

-- ============================================================
-- 4. CommunityLimitRestriction — コミュニティグレード × 数量上限
-- ============================================================

-- メンバー上限
INSERT INTO "CommunityLimitRestriction" ("id","grade","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxMembers', 30, NOW(), NOW())
ON CONFLICT ("grade","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "CommunityLimitRestriction" ("id","grade","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'maxMembers', -1, NOW(), NOW())
ON CONFLICT ("grade","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- タグ上限
INSERT INTO "CommunityLimitRestriction" ("id","grade","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'FREE', 'maxTags', 5, NOW(), NOW())
ON CONFLICT ("grade","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

INSERT INTO "CommunityLimitRestriction" ("id","grade","limitKey","value","createdAt","updatedAt")
VALUES (gen_random_uuid(), 'PREMIUM', 'maxTags', 100, NOW(), NOW())
ON CONFLICT ("grade","limitKey") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
