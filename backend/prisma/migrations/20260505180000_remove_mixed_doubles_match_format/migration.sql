-- Remove "混合ダブルス" CategoryMatchFormat entries.
-- 男女を区別するロジックは存在しないため、混合ダブルスを削除する。
DELETE FROM "CategoryMatchFormat"
WHERE "id" IN ('cmf-badminton-mixed', 'cmf-tennis-mixed')
   OR "name" = '混合ダブルス';
