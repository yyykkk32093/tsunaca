-- Wave6 Phase 9b-17 + 9b-01:
-- 1) HelpSubscription テーブル撤去（draft 公開運用を行わないため）
-- 2) HelpFeedback に categorySlug 追加 + [userId, articleSlug] 一意化（再投票 upsert）+ updatedAt 追加

-- ============================================================
-- 1. HelpSubscription 撤去
-- ============================================================
DROP TABLE IF EXISTS "HelpSubscription";

-- ============================================================
-- 2. HelpFeedback の拡張
-- ============================================================
-- categorySlug を NOT NULL で追加。既存行（評価実績はゼロ前提）には 'unknown' を一旦埋める。
ALTER TABLE "HelpFeedback"
    ADD COLUMN "categorySlug" VARCHAR(100) NOT NULL DEFAULT 'unknown';
ALTER TABLE "HelpFeedback"
    ALTER COLUMN "categorySlug" DROP DEFAULT;

-- updatedAt（再投票 upsert で更新）
ALTER TABLE "HelpFeedback"
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 認証ユーザーの再投票上書き用 unique（NULL は衝突しない＝匿名は複数行許容）
CREATE UNIQUE INDEX "HelpFeedback_userId_articleSlug_key"
    ON "HelpFeedback"("userId", "articleSlug");

-- 集計用（ドメイン軸グルーピング）
CREATE INDEX "HelpFeedback_categorySlug_createdAt_idx"
    ON "HelpFeedback"("categorySlug", "createdAt");
