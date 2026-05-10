-- Placeマスタ（OSM）投入SQL
--
-- 使い方:
--   cd backend
--   set -a && source env/.env.local && set +a
--   PSQL_URL="$(echo \"$DATABASE_URL\" | sed 's/[?&]schema=[^&]*//g')" \
--   && psql "$PSQL_URL" \
--     -v osm_jsonl="$(pwd)/infra/database/seeds/osm/data/places.jsonl" \
--     -f infra/database/seeds/place-master-osm-import.sql
--
-- 入力JSONLの1行フォーマット（transform.ts出力）:
-- {"sourceId":"osm:way:...","name":"...","address":"...","lat":35.0,"lng":139.0,
--  "normalizedName":"...","normalizedAddress":"...","category":"community_centre"}

\if :{?osm_jsonl}
\else
\echo '[ERROR] psql variable "osm_jsonl" is required.'
\echo '        Example: -v osm_jsonl="$(pwd)/infra/database/seeds/osm/data/places.jsonl"'
\quit 1
\endif

BEGIN;

CREATE TEMP TABLE _place_import_raw (
  payload jsonb NOT NULL
);

\copy _place_import_raw(payload) FROM :'osm_jsonl'

CREATE TEMP TABLE _place_snapshot AS
SELECT
  (payload->>'sourceId')::varchar(100) AS "sourceId",
  LEFT(COALESCE(payload->>'name', ''), 200)::varchar(200) AS "name",
  LEFT(COALESCE(payload->>'address', ''), 500)::varchar(500) AS "address",
  (payload->>'lat')::double precision AS "lat",
  (payload->>'lng')::double precision AS "lng",
  LEFT(COALESCE(payload->>'normalizedName', ''), 200)::varchar(200) AS "normalizedName",
  LEFT(COALESCE(payload->>'normalizedAddress', ''), 500)::varchar(500) AS "normalizedAddress",
  NULLIF(payload->>'category', '')::varchar(50) AS "category"
FROM _place_import_raw;

-- 妥当性チェック
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _place_snapshot
    WHERE "sourceId" IS NULL OR "sourceId" = '' OR "name" = ''
  ) THEN
    RAISE EXCEPTION 'Invalid row found in _place_snapshot (sourceId/name is empty).';
  END IF;
END $$;

-- upsert（usageCount は更新しない）
INSERT INTO "Place" (
  "id",
  "name",
  "address",
  "lat",
  "lng",
  "normalizedName",
  "normalizedAddress",
  "category",
  "source",
  "sourceId",
  "usageCount",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  s."name",
  s."address",
  s."lat",
  s."lng",
  s."normalizedName",
  s."normalizedAddress",
  s."category",
  'osm',
  s."sourceId",
  0,
  true,
  NOW(),
  NOW()
FROM _place_snapshot s
ON CONFLICT ("source", "sourceId") DO UPDATE SET
  "name" = EXCLUDED."name",
  "address" = EXCLUDED."address",
  "lat" = EXCLUDED."lat",
  "lng" = EXCLUDED."lng",
  "normalizedName" = EXCLUDED."normalizedName",
  "normalizedAddress" = EXCLUDED."normalizedAddress",
  "category" = EXCLUDED."category",
  "isActive" = true,
  "updatedAt" = NOW();

-- スナップショットに含まれないOSM Placeは論理削除
UPDATE "Place" p
SET
  "isActive" = false,
  "updatedAt" = NOW()
WHERE p."source" = 'osm'
  AND p."isActive" = true
  AND NOT EXISTS (
    SELECT 1
    FROM _place_snapshot s
    WHERE s."sourceId" = p."sourceId"
  );

COMMIT;

-- 確認出力
SELECT COUNT(*)::int AS active_place_count
FROM "Place"
WHERE "source" = 'osm' AND "isActive" = true;
