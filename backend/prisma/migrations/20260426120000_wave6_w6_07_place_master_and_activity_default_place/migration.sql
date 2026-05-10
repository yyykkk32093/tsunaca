-- Wave6 Phase6 W6-07: 開催場所マスタ（Place）新設 + Activity 改修
-- 1) Place マスタテーブル新設
-- 2) Activity に defaultPlaceId / defaultLocationCustom / isOnline 追加
-- 3) Activity から defaultLocation / defaultAddress 削除（未リリース前提・データ破棄）
-- 4) pg_trgm 拡張 + 検索用GINインデックス追加
--
-- 参照: projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/phase6-progress.md

-- ========== 1. pg_trgm 拡張 ==========
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========== 2. Place テーブル ==========
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "normalizedName" VARCHAR(200) NOT NULL,
    "normalizedAddress" VARCHAR(500) NOT NULL,
    "category" VARCHAR(50),
    "source" VARCHAR(20) NOT NULL,
    "sourceId" VARCHAR(100) NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Place_source_sourceId_key" ON "Place"("source", "sourceId");
CREATE INDEX "Place_isActive_usageCount_idx" ON "Place"("isActive", "usageCount" DESC);

-- pg_trgm GINインデックス（前方一致 + 類似度検索の高速化）
CREATE INDEX "Place_normalizedName_trgm_idx" ON "Place" USING GIN ("normalizedName" gin_trgm_ops);
CREATE INDEX "Place_normalizedAddress_trgm_idx" ON "Place" USING GIN ("normalizedAddress" gin_trgm_ops);

-- ========== 3. Activity 改修 ==========
ALTER TABLE "Activity" ADD COLUMN "defaultPlaceId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "defaultLocationCustom" TEXT;
ALTER TABLE "Activity" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;

-- 既存カラム削除（未リリース前提・データ破棄）
ALTER TABLE "Activity" DROP COLUMN IF EXISTS "defaultLocation";
ALTER TABLE "Activity" DROP COLUMN IF EXISTS "defaultAddress";

-- 外部キー
ALTER TABLE "Activity"
    ADD CONSTRAINT "Activity_defaultPlaceId_fkey"
    FOREIGN KEY ("defaultPlaceId") REFERENCES "Place"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Activity_defaultPlaceId_idx" ON "Activity"("defaultPlaceId");
