-- Wave6 Phase 9b-05: User.locale 追加
-- 表示言語 ('ja' | 'en')。null = 未設定（クライアントで判定）
-- 関連: projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/phase9b-progress.md

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "locale" TEXT;
