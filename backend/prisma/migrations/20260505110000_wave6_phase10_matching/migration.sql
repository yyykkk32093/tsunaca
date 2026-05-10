-- Wave6 Phase10: 組み合わせ機能（Schedule紐付け永続化 + レベル管理 + 競技フォーマット）

-- 1) 既存テーブルにレベル列を追加
ALTER TABLE "Participation"
  ADD COLUMN "visitorLevel" INTEGER;

ALTER TABLE "CommunityMembership"
  ADD COLUMN "level" INTEGER;

-- 2) カテゴリ別フォーマットマスタ
CREATE TABLE "CategoryMatchFormat" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playersPerGroup" INTEGER NOT NULL,
  "groupsPerCourt" INTEGER NOT NULL DEFAULT 2,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CategoryMatchFormat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryMatchFormat_categoryId_name_key"
  ON "CategoryMatchFormat"("categoryId", "name");

CREATE INDEX "CategoryMatchFormat_categoryId_sortOrder_idx"
  ON "CategoryMatchFormat"("categoryId", "sortOrder");

ALTER TABLE "CategoryMatchFormat"
  ADD CONSTRAINT "CategoryMatchFormat_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "CategoryMaster"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) スケジュール単位の組み合わせ結果
CREATE TABLE "MatchingResult" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "params" JSONB NOT NULL,
  "rounds" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchingResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchingResult_scheduleId_key"
  ON "MatchingResult"("scheduleId");

CREATE INDEX "MatchingResult_createdBy_idx"
  ON "MatchingResult"("createdBy");

ALTER TABLE "MatchingResult"
  ADD CONSTRAINT "MatchingResult_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchingResult"
  ADD CONSTRAINT "MatchingResult_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
