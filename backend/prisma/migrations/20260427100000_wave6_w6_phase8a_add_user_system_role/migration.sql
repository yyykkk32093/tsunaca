-- Wave6 Phase 8-A: User.systemRole カラム追加
-- プラットフォーム（運営側）権限。テナント内の CommunityMembership.role とは別概念。
-- 値: 'USER' | 'OPERATOR' | 'SUPER_ADMIN'
-- USER: 一般利用者 / OPERATOR: 運営オペレーター（問い合わせ対応・ヘルプ管理）/ SUPER_ADMIN: 全権

ALTER TABLE "User"
  ADD COLUMN "system_role" TEXT NOT NULL DEFAULT 'USER';

-- 既存ユーザーは全て USER（DEFAULT で投入済み）
-- 運営アカウントへの昇格は seed 投入またはアプリ運用 SQL で実施する
