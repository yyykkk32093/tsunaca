-- Wave6 Phase 8-B + Phase 7: Inquiry 系 + HelpFeedback / HelpSubscription
-- 詳細: projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/phase8-progress.md

-- ============================================================
-- 1. InquiryCategory（問い合わせカテゴリマスタ）
-- ============================================================
CREATE TABLE "InquiryCategory" (
    "id"                       TEXT PRIMARY KEY,
    "slug"                     TEXT NOT NULL UNIQUE,
    "labelI18n"                JSONB NOT NULL,
    "relatedHelpCategorySlug"  TEXT,
    "sortOrder"                INTEGER NOT NULL DEFAULT 0,
    "isActive"                 BOOLEAN NOT NULL DEFAULT true,
    "isAnonymousOnly"          BOOLEAN NOT NULL DEFAULT false,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL
);
CREATE INDEX "InquiryCategory_isActive_sortOrder_idx" ON "InquiryCategory"("isActive", "sortOrder");

-- ============================================================
-- 2. Inquiry（問い合わせスレッド本体）
-- ============================================================
CREATE TABLE "Inquiry" (
    "id"             TEXT PRIMARY KEY,
    "userId"         TEXT,
    "contactEmail"   TEXT,
    "categoryId"     TEXT NOT NULL,
    "title"          VARCHAR(200) NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'OPEN',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt"     TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
    CONSTRAINT "Inquiry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InquiryCategory"("id")
);
CREATE INDEX "Inquiry_userId_lastActivityAt_idx" ON "Inquiry"("userId", "lastActivityAt" DESC);
CREATE INDEX "Inquiry_status_lastActivityAt_idx" ON "Inquiry"("status", "lastActivityAt" DESC);
CREATE INDEX "Inquiry_categoryId_idx" ON "Inquiry"("categoryId");

-- ============================================================
-- 3. InquiryMessage（スレッド内メッセージ）
-- ============================================================
CREATE TABLE "InquiryMessage" (
    "id"            TEXT PRIMARY KEY,
    "inquiryId"     TEXT NOT NULL,
    "authorType"    TEXT NOT NULL,
    "authorUserId"  TEXT,
    "body"          TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE
);
CREATE INDEX "InquiryMessage_inquiryId_createdAt_idx" ON "InquiryMessage"("inquiryId", "createdAt");

-- ============================================================
-- 4. InquiryAttachment（添付ファイル）
-- ============================================================
CREATE TABLE "InquiryAttachment" (
    "id"          TEXT PRIMARY KEY,
    "messageId"   TEXT NOT NULL,
    "storageKey"  TEXT NOT NULL UNIQUE,
    "fileName"    VARCHAR(255) NOT NULL,
    "mimeType"    VARCHAR(100) NOT NULL,
    "sizeBytes"   INTEGER NOT NULL,
    "scanStatus"  TEXT NOT NULL DEFAULT 'PENDING',
    "scannedAt"   TIMESTAMP(3),
    "isPurged"    BOOLEAN NOT NULL DEFAULT false,
    "purgedAt"    TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InquiryMessage"("id") ON DELETE CASCADE
);
CREATE INDEX "InquiryAttachment_messageId_idx" ON "InquiryAttachment"("messageId");
CREATE INDEX "InquiryAttachment_scanStatus_idx" ON "InquiryAttachment"("scanStatus");
CREATE INDEX "InquiryAttachment_isPurged_idx" ON "InquiryAttachment"("isPurged");

-- ============================================================
-- 5. HelpFeedback（Phase 7 ヘルプ記事フィードバック）
-- ============================================================
CREATE TABLE "HelpFeedback" (
    "id"          TEXT PRIMARY KEY,
    "articleSlug" VARCHAR(200) NOT NULL,
    "userId"      TEXT,
    "helpful"     BOOLEAN NOT NULL,
    "comment"     VARCHAR(500),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HelpFeedback_articleSlug_createdAt_idx" ON "HelpFeedback"("articleSlug", "createdAt");

-- ============================================================
-- 6. HelpSubscription（Phase 7 ヘルプ更新購読）
-- ============================================================
CREATE TABLE "HelpSubscription" (
    "id"        TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL,
    "scope"     VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelpSubscription_userId_scope_key" UNIQUE ("userId", "scope")
);
CREATE INDEX "HelpSubscription_userId_idx" ON "HelpSubscription"("userId");

-- ============================================================
-- 7. InquiryCategory 初期データ
-- ============================================================
INSERT INTO "InquiryCategory" ("id", "slug", "labelI18n", "relatedHelpCategorySlug", "sortOrder", "isActive", "isAnonymousOnly", "createdAt", "updatedAt")
VALUES
    ('cat_general',       'general',       '{"ja":"一般的な質問","en":"General question"}',                NULL,            10, true,  false, NOW(), NOW()),
    ('cat_account',       'account',       '{"ja":"アカウント・プロフィール","en":"Account / Profile"}',      'account',        20, true,  false, NOW(), NOW()),
    ('cat_billing',       'billing',       '{"ja":"課金・支払い","en":"Billing / Payment"}',                'billing',        30, true,  false, NOW(), NOW()),
    ('cat_community',     'community',     '{"ja":"コミュニティ運営","en":"Community management"}',          'community',      40, true,  false, NOW(), NOW()),
    ('cat_activity',      'activity',      '{"ja":"アクティビティ・参加","en":"Activity / Participation"}', 'activity',       50, true,  false, NOW(), NOW()),
    ('cat_bug_report',    'bug_report',    '{"ja":"不具合報告","en":"Bug report"}',                         NULL,            60, true,  false, NOW(), NOW()),
    ('cat_feature_req',   'feature_req',   '{"ja":"機能リクエスト","en":"Feature request"}',                NULL,            70, true,  false, NOW(), NOW()),
    ('cat_login_trouble', 'login_trouble', '{"ja":"ログイン・登録の不具合","en":"Login / Sign-up issue"}', 'login_trouble',  80, true,  true,  NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
