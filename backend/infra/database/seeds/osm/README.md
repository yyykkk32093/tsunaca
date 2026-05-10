# OSM 開催場所マスタ生成スクリプト

> Wave6 Phase6 W6-07「開催場所入力UX改善」の成果物。
> OpenStreetMap (OSM) の日本リージョンPBFから会場候補POIを抽出し、`Place` テーブルに upsert する。
> 初期マスタ投入と CF-5「OSM開催場所マスタ最新化ジョブ（月次）」の双方から再利用される。

## 前提

- `osmium-tool` がインストールされていること
  - macOS: `brew install osmium-tool`
  - Linux/EC2: `sudo apt-get install osmium-tool`
- `DATABASE_URL` 環境変数が設定されていること（`backend/env/.env.local` から読む想定）
- pnpm 利用（リポジトリ標準）

## 配置ファイル

```
backend/infra/database/seeds/osm/
├── README.md          ← 本ファイル
├── package.json       ← npm scripts 定義
├── tsconfig.json
├── download.sh        ← Geofabrik 日本PBF取得
├── config.ts          ← 抽出対象タグ・除外条件
├── extract.ts         ← osmium で対象POIを抽出 → JSONL
├── transform.ts       ← name/address/lat/lng整形・正規化 → places.jsonl
├── import.ts          ← Prisma経由で Place upsert
├── normalize.ts       ← 共通正規化ユーティリティ
└── data/              ← 中間ファイル（.gitignore）
```

## 実行手順（初回 / 月次最新化共通）

```bash
cd backend/infra/database/seeds/osm
pnpm install   # 初回のみ

# 一括実行
pnpm osm:run-all

# もしくは個別ステップ
pnpm osm:download   # 1) Geofabrik から japan-latest.osm.pbf を取得
pnpm osm:extract    # 2) osmium で対象タグの POI を抽出
pnpm osm:transform  # 3) name/address/lat/lng 整形 + 正規化
pnpm osm:import     # 4) Prisma経由で Place を upsert
```

## ライセンス

OSM データは **ODbL (Open Database License)** で提供される。
- 出典表示が必要: アプリ内に「© OpenStreetMap contributors」を明記
- 派生データベースを公開する場合は同ライセンスでの再配布が必要（社内利用の範囲では問題なし）
- 詳細: https://www.openstreetmap.org/copyright

## CF-5（月次最新化ジョブ）との関係

- 本スクリプトは「再実行可能」「冪等」を満たす設計
- `(source, sourceId)` UNIQUE で安定マッピング、`usageCount` は upsert で保持
- 当回のスナップショットに含まれない既存Placeは `import.ts` 内で `isActive=false` に降格
- 物理削除はしない（`Activity.defaultPlaceId` 参照済み行の整合性維持のため）
