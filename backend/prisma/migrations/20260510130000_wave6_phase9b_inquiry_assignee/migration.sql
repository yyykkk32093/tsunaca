-- Wave6 Phase 9b-16: Inquiry に担当オペレーター（assigneeUserId）を追加
-- nullable FK → User.id（ON DELETE SET NULL）
-- 関連: projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/phase9b-progress.md

-- ============================================================
-- 1) カラム追加
-- ============================================================
ALTER TABLE "Inquiry"
  ADD COLUMN IF NOT EXISTS "assigneeUserId" TEXT;

-- ============================================================
-- 2) FK 制約（User.id 削除時は SET NULL: 担当者ユーザー削除でも問い合わせは保持）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Inquiry_assigneeUserId_fkey'
  ) THEN
    ALTER TABLE "Inquiry"
      ADD CONSTRAINT "Inquiry_assigneeUserId_fkey"
      FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 3) フィルタ用インデックス（自分の担当 / 未割当 で絞り込み）
-- ============================================================
CREATE INDEX IF NOT EXISTS "Inquiry_assigneeUserId_status_idx"
  ON "Inquiry" ("assigneeUserId", "status");
