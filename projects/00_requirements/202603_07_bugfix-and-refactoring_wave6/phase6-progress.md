.# Phase 6 — 開催場所入力UX改善（W6-07）

> **最終更新**: 2026-04-27
> **ステータス**: ✅ Phase 6 完了（W6-07 + 後続改善完了）

## フェーズ概要
- **ゴール**: 開催場所入力で住所候補表示を導入し、`開催場所` と `開催場所住所` の入力体験を統合する
- **対象**: W6-07
- **変更対象レイヤー**: UI / API / Domain / DB / Infra（OSMマスタ生成スクリプト）

## タスク一覧

| タスク                                                | 状態   | 備考                                                            |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------- |
| W6-07a Prismaスキーマ変更（Place新設 / Activity改修） | ✅ 完了 | Place / `defaultPlaceId` / `defaultLocationCustom` / `isOnline` |
| W6-07b OSM準拠マスタ生成スクリプト整備                | ✅ 完了 | `backend/infra/osm/` 配下に成果物として保存                     |
| W6-07c Place ドメイン・リポジトリ・UseCase・API       | ✅ 完了 | `GET /v1/places/search`                                         |
| W6-07d Activity ドメイン・UseCase・API改修            | ✅ 完了 | `defaultAddress` 廃止、`isOnline`移管、新フィールド対応         |
| W6-07e フロント統合（ActivityForm / ActivityDetail）  | ✅ 完了 | 単一Combobox + 自由入力併存、`isOnline`UI                       |
| W6-07f テストデータ再生成                             | ✅ 完了 | `e2e-seed-data.sql` を新スキーマで再構成                        |
| W6-07g OSMマスタ最新化ジョブ（スケルトン）            | ✅ 完了 | 本実装は CF-5（バックログ）。本フェーズは骨格のみ用意           |

## 確定方針（2026-04-26 合意）

### 候補API選定
- **採用**: OSM準拠の自前マスタのみ。**外部APIは使用しない**
  - Google Places / Mapbox / HERE / Nominatim API のいずれも採用しない
  - ToS制約・コスト不確定性・ベンダーロックイン回避のため
- マスタ生成元: OpenStreetMap (Geofabrik 日本リージョンPBF)
- ライセンス: ODbL（出典表示で運用可能）

### データモデル
- **Place（マスタ・新設）**: `id` / `name` / `address` / `lat` / `lng` / `normalizedName` / `normalizedAddress` / `category` / `source` / `sourceId` / `usageCount` / `isActive` / `createdAt` / `updatedAt`
- **Activity の変更**:
  - 追加: `defaultPlaceId` (FK, nullable) / `defaultLocationCustom` (string, ≤200, nullable) / `isOnline` (boolean, default false)
  - 削除: `defaultAddress`、既存 `defaultLocation`
- **整合性**: `(isOnline=true) XOR (defaultPlaceId !=null) XOR (defaultLocationCustom !=null) XOR (全て未設定=未定)` をアプリ層（ドメインエンティティ）で保証
- **未リリース前提**: `defaultAddress` / `defaultLocation` 既存データは破棄、seed再作成

### 入力UX
- 単一Combobox: 入力中に候補リスト（debounce検索）→ 候補選択で `defaultPlaceId` 確定／不一致は自由入力で確定
- 候補に該当が無い場合は **自由入力で確定可能**（`defaultLocationCustom` に保存）
- オンライン開催時はチェックボックスで切替、Combobox非活性、`place` / `custom` を null 送信

### 検索方式
- 前方一致 + 部分一致 + char-bigram Jaccard + `usageCount` の合成スコアで上位N件
- 0件時は空配列を返却 → フロントが自由入力誘導

### スコープ除外
- Schedule個別「今回の会場」入力UI新設（既存の `Schedule.location` フリーテキストは維持）
- CF-5（OSMマスタ最新化ジョブ）の本実装 — 本フェーズはスケルトンのみ。詳細仕様・運用設計は CF-5 で扱う

### OSMマスタ生成スクリプトの位置付け
- **成果物としてリポジトリに保存**: `backend/infra/osm/` 配下
- 構成: `README.md` / `download.sh` / `extract.ts` / `transform.ts` / `import.ts` / `config.ts` / `package.json`
- 中間ファイル（`*.pbf` / `*.jsonl`）は `.gitignore`、スクリプト本体は commit
- 初期マスタ投入と CF-5（月次最新化ジョブ）の双方から再利用

## OSMマスタ初期生成手順

1. 事前準備: `brew install osmium-tool`（macOS）／ `apt-get install osmium-tool`（Linux/EC2）
2. `cd backend/infra/osm`
3. `pnpm osm:download` — Geofabrik 日本PBF を `./data/japan-latest.osm.pbf` に取得
4. `pnpm osm:extract` — `osmium tags-filter` で対象タグ抽出 → `./data/extracted.geojson`
5. `pnpm osm:transform` — name/address/lat/lng整形 + 正規化 → `./data/places.jsonl`
6. `pnpm osm:import` — Prisma経由で Place upsert（`source`=`osm` + `sourceId` 基準）
7. もしくは `pnpm osm:run-all` で 3〜6 を一括実行

## マスタ最新化ジョブ（概要、本実装は CF-5）

- **頻度**: **月次**（毎月1日 03:00 JST 想定）
- **動作**: `osm:run-all` を再実行 → 既存PlaceはUPSERT、応答に含まれなくなった行は `isActive=false` に降格
- **配置**: `backend/src/job/place-osm-refresh/` にスケルトン配置
- **本実装スコープ**: スケジューラ統合、監視・通知、ロールバック手順、blue/green切替、運用Runbook → CF-5 で対応

## Q&A 設計確定事項（2026-04-25 確定）

| #   | 質問                            | 確定                                                                      |
| --- | ------------------------------- | ------------------------------------------------------------------------- |
| Q2  | データ保持: 表示文字列 / 緯経度 | **両方保持**（lat/lng も保存）                                            |
| Q3  | Place参照と自由入力             | **両方併存可能**（`defaultPlaceId` または `defaultLocationCustom`）       |
| Q4  | オンライン表現                  | **`isOnline` フラグ**で管理（location文字列に「オンライン」を保存しない） |
| Q5  | Schedule個別会場                | **新設しない**（既存のフリーテキスト維持）                                |
| Q6  | 検索方式                        | **前方一致 + trigram + 人気順**                                           |
| Q7  | 自由入力許容                    | **許容**（候補不一致でも保存可能）                                        |
| Q8  | 表示形式                        | **選択チップ + クリアボタン**                                             |
| Q9  | 既存データ移行                  | **未リリース前提で破棄**、seed再投入                                      |

## 実装前チェックリスト

- [x] 候補APIの採用方針を確定（OSM自前マスタ）
- [x] 既存データ移行方針を確定（破棄）
- [x] UIモック方針を確定（候補リスト + チップ + クリア）
- [x] 失敗時の手入力フォールバック仕様を確定
- [x] OSMマスタ生成手順を確定
- [x] マスタ最新化ジョブの運用方針（月次）を確定 → CF-5 登録

## 受入条件

- [x] 開催場所入力中に候補が表示される（入力1文字以上）
- [x] 候補選択で `defaultPlaceId` に保存される
- [x] 候補不一致時に自由入力で `defaultLocationCustom` に保存される
- [x] オンライン開催時は `isOnline=true` で保存され、会場入力が非活性になる
- [x] 編集再表示で 3パターン（Place参照 / 自由入力 / オンライン）が正しく復元される
- [x] `defaultAddress` 依存UIが残っていない
- [x] OSMスクリプト一式が `backend/infra/osm/` に配置されている
- [x] `osm:run-all` 実行で Place レコードが投入される（ローカル確認）
- [x] `e2e-seed-data.sql` 投入後にActivity作成・詳細表示が通る
- [x] BE / FE 型チェックが通る

## 作業ログ

- 2026-04-25: 現状調査を実施。住所候補実装は未着手、2項目分離状態を確認。
- 2026-04-26: 候補API比較（Google / Mapbox / HERE / Nominatim / OSM自前）→ **OSM準拠の自前マスタのみ採用**で確定。Q1-Q9確定。実装プラン策定。CF-5（OSMマスタ最新化ジョブ・月次）をバックログ登録。実装着手。
- 2026-04-26: BE/FE 通しで実装完了。Place ドメイン（VO / Entity / Repository / SearchUseCase / API） + Activity 集約破壊変更（`defaultLocation`/`defaultAddress` 廃止 → `defaultPlaceId` / `defaultLocationCustom` / `isOnline`）。`DefaultLocation` VO を削除。e2e seed・e2e テスト・フロント全画面・型を新モデルへ同期。`tsc -p tsconfig.server.json` および `frontend tsc --noEmit` で型エラー解消。Place 検索 Combobox UI 実装は WAVE 後半 / バックログへ繰越。
- 2026-04-27: W6-07 後続改善を実施。
  - 設計書 `projects/01_design/01_backend/place-search-and-cache.md` 作成。
  - 検索品質: pg_trgm が日本語マルチバイトに非対応であることを `backend/scripts/debug-place-search.ts` で確認 → TS側で char-bigram Jaccard を自前実装。
  - 共通正規化モジュール `backend/src/_sharedTech/text/placeNormalize.ts` 新設（normalizePlaceName/Address/Query）。
  - 全件オンメモリキャッシュ `backend/src/domains/place/infrastructure/cache/PlaceMemoryCache.ts` 実装（シングルトン、起動時 initialize、`isReady()` で DB フォールバック）。`PlaceRepositoryImpl` を cache 経由 + LIKE フォールバック構成に改修。`server.ts` 起動時に `PlaceMemoryCache.initialize(prisma)` 呼び出し追加。
  - スコア式: `prefix(0.5) + contains(0.2) + bigramJaccard*0.4 + log10(1+usage)*0.1 + (1/len)*0.05`、検索閾値 0.2。
  - OSM 抽出タグ拡張（`arts_centre` / `social_centre` / `building=civic|public` / `office=government` 等、計18タグ）。
  - dedup ロジック改善: osmium が way + area で同一施設を重複出力する事象を `backend/infra/osm/transform.ts` で way > node > area 優先 + `name + lat/lng(小数4桁)` キーで除去。
  - 案E実装: 緯度経度が name 持ち全件に存在することを `backend/scripts/count-extract-stats.ts` で確認 → `address` 必須を解除し `name + lat/lng` 必須に変更。住所欠落時は `address=''` で投入。
  - 投入結果: **253,968件**（住所空 221,606件、住所有 32,362件）。雪谷文化センターのヒットを確認（lat=35.5881768, lng=139.6904526, category=community_centre）。
  - フロント: `PlaceCombobox` から注意文言・選択チップを削除し、入力欄下に住所補助表示（`text-xs text-gray-400 truncate`）を追加。`initialAddress` prop で編集再表示にも対応。
  - フロント: `ActivityDetailPage` の住所行を削除し、開催場所名そのものを Google Maps リンク化（`https://www.google.com/maps/search/?api=1&query=lat,lng` + ExternalLink アイコン）。
  - 型チェック: BE/FE 共にクリーン。
  - 実機動作確認: 検索表示・保存・詳細表示・Google Maps 遷移を確認。
  - ライセンス対応: OpenStreetMap データ利用のクレジット表示（`© OpenStreetMap contributors`）を開催場所入力/表示UIに追加。
