# OSMローカルDBインポート手順（実エラー対応付き）

最終更新: 2026-04-26

## 0. PBFの配置先

PBFは以下に置く。

- `backend/infra/database/seeds/osm/data/japan-latest.osm.pbf`

`backend/infra/database/seeds/osm/pbf/` に置くと `extract.ts` が参照できない。

## 1. 事前準備

```bash
# macOS
brew install osmium-tool

# Placeテーブル未作成なら先にマイグレーション適用
cd backend
set -a && source env/.env.local && set +a
pnpm prisma migrate status
pnpm prisma migrate dev --name apply_pending_place_table_migration
```

## 2. 抽出・整形・インポート（推奨実行方法）

`backend/infra/database/seeds/osm` 直下の `pnpm osm:*` ではなく、`backend` から `pnpm dlx tsx` で実行する。

理由:
- `backend/infra/database/seeds/osm` に別系統の `@prisma/client` が入ると `prisma.place` が `undefined` になるケースがあったため

```bash
cd backend

# 1) 抽出
pnpm dlx tsx infra/database/seeds/osm/extract.ts

# 2) 整形
pnpm dlx tsx infra/database/seeds/osm/transform.ts

# 3) インポート
set -a && source env/.env.local && set +a
pnpm dlx tsx infra/database/seeds/osm/import.ts
```

## 3. 結果確認

```bash
cd backend
set -a && source env/.env.local && set +a
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.place.count().then(c=>{console.log('Place count=',c);}).finally(()=>p.$disconnect());"
```

## 4. 今回実際に踏んだエラーと対処

### エラー1: `tsx: command not found`

症状:
- `pnpm osm:extract` で `sh: tsx: command not found`

原因:
- `backend/infra/database/seeds/osm` 側依存が未解決

対処:
- 推奨は `backend` から `pnpm dlx tsx ...` で直接実行
- どうしても `osm:extract` を使うなら `backend/infra/database/seeds/osm` でローカル依存を解決する

### エラー2: `osmium` 実行失敗

症状:
- `Command failed: osmium (exit null)`

原因:
- `osmium-tool` 未インストール

対処:
- `brew install osmium-tool`

### エラー3: `Cannot read properties of undefined (reading 'updateMany')`

症状:
- `import.ts` の `prisma.place.updateMany` で落ちる

原因:
- `backend/infra/database/seeds/osm` 側に別バージョンの `@prisma/client` が入り、生成済みクライアントと不整合

対処:
- `backend` 側の Prisma Client を使って実行する（`pnpm dlx tsx infra/database/seeds/osm/import.ts`）
- 既に `backend/infra/database/seeds/osm/node_modules` を作ってしまった場合は削除してから再実行

### エラー4: `The table public.Place does not exist`

症状:
- インポート時に `P2021`

原因:
- Place関連マイグレーション未適用

対処:
- `pnpm prisma migrate dev --name apply_pending_place_table_migration`

### エラー5: `transform kept=0`（0件インポート）

症状:
- `transform` が `kept=0 excluded=...`
- `import total upserted: 0`

今回の確認結果:
- `extracted.jsonl` に `name` はあるが `addr:*` が無いレコードが大半
- 現行 `config.ts` の `shouldExclude` が「address必須」のため全除外されやすい

対処案:
- `shouldExclude` の address必須条件を緩和する（nameのみ必須にする等）
- または `transform.ts` の `buildAddress` fallback を拡張する
- 変更後に `transform.ts` と `import.ts` を再実行

## 5. 最短再実行コマンド

```bash
cd backend
pnpm dlx tsx infra/database/seeds/osm/transform.ts
set -a && source env/.env.local && set +a
pnpm dlx tsx infra/database/seeds/osm/import.ts
```

## 6. タグ拡張（W6-07 後続）後の再投入実績

`config.ts` の `EXTRACT_TAGS` を中間スコープ拡張した結果（2026-04-26 実施）:

| 指標                       | 拡張前  | 拡張後   |
| -------------------------- | ------- | -------- |
| 抽出 features 数           | 514,860 | 639,313  |
| transform kept             | 34,970  | 37,394   |
| Place isActive=true 総件数 | 34,970  | 37,394   |
| 名前に「文化センター」     | 73      | 96 (+23) |
| カテゴリ civic             | 1,633   | 2,740    |
| カテゴリ public_building   | 897     | 2,132    |

設計書: `projects/01_design/01_backend/place-search-and-cache.md`

## 7. デバッグスクリプト

`backend/scripts/debug-place-search.ts` で「国分寺」「文化センター」等のヒット件数・スコアを計測できる。

```bash
cd backend
set -a && source env/.env.local && set +a
pnpm dlx tsx scripts/debug-place-search.ts
```
