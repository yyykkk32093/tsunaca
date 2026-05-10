# Place検索UX改善 + 全件オンメモリキャッシュ 設計書

> 案件: Wave6 Phase6 W6-07 後続改善（5項目: ①OSMタグ拡張 / ②注意文言削除 / ③検索一致条件強化 / ④チップ削除 / ⑥メモリキャッシュ化）
> 作成日: 2026-04-26
> 関連: `projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/`

---

## 1. 背景と課題

W6-07 で OSM 由来の Place マスタ（34,970 件）を投入した直後、以下の品質課題が判明した。

| ID  | 課題                                                          | 真因                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ①   | 「文化センター」候補が極端に少ない                            | OSM抽出タグが狭く `amenity=community_centre` のみ。`arts_centre` / `social_centre` / `building=civic` 等を取りこぼし                                                                                                                                         |
| ②   | 「マスタに一致する場所が見つかりません...」のヒント文言が冗長 | 自由入力可能なUXに反する不要表示                                                                                                                                                                                                                             |
| ③   | 「国分寺」で「国分寺台文化センター」がヒットしない            | **真因（Phase1デバッグで判明）**: ① pg_trgm の `similarity()` は ASCII trigram 前提で日本語マルチバイトに対して常に 0 を返す ② スコアが prefix一致=0.3 / contains一致=0 の固定値になりタイ多発 ③ Limit=10 で「国分寺台文化センター」が同点12位以下で切られる |
| ④   | 候補選択後に表示される MapPin チップが視覚的ノイズ            | 入力欄テキストと冗長                                                                                                                                                                                                                                         |
| ⑥   | オートコンプリート毎にDB検索（pg_trgmは比較的軽いが将来不安） | 全件34,970件は約17MB に収まるためオンメモリ化の方が合理的                                                                                                                                                                                                    |

---

## 2. 全体方針

```
Phase1: デバッグスクリプトで現状ヒット件数・スコア計測（真因確定）
Phase2: OSM抽出タグを「中間スコープ」に拡張し再投入
Phase3: 検索正規化を投入時と完全同期 + SEARCH_SQL改修（部分一致追加・閾値緩和）
Phase4: 全件オンメモリ PlaceMemoryCache を導入し、Repository は cache 経由 + DB フォールバック
Phase5: フロントから不要要素削除（注意文言・チップ）
Phase6: 検証
```

**設計判断（ユーザー方針確認済）**

| 項目         | 決定                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| キャッシュ   | **全件オンメモリ採用**（TTLクエリキャッシュは不採用）                        |
| 抽出タグ     | 中間スコープ（既存 + `arts_centre` / `social_centre` / `building=civic` 等） |
| address必須  | 維持（緩和しない）                                                           |
| 検索戦略     | 案2（部分一致追加 + 正規化を投入時と完全同期）                               |
| デバッグ優先 | Phase1 で実データ計測してから Phase2-4 着手                                  |

---

## 3. アーキテクチャ

### 3.1 レイヤ構成（変更後）

```
┌────────────────────────────────────────────────┐
│ FE: PlaceCombobox                               │
└──────────────┬─────────────────────────────────┘
               │ GET /v1/places/search?q=...
               ▼
┌────────────────────────────────────────────────┐
│ API: placeController                            │
└──────────────┬─────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────┐
│ UseCase: SearchPlaceUseCase                     │
└──────────────┬─────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────┐
│ Domain: IPlaceRepository                        │
└──────────────┬─────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────┐
│ Infrastructure: PlaceRepositoryImpl             │
│  ├── PlaceMemoryCache.isReady()                 │
│  │   ├── true  → cache.search() (in-memory)    │
│  │   └── false → Prisma SQL (DBフォールバック) │
│  └── incrementUsageCount → DB + cache 同期更新 │
└────────────────────────────────────────────────┘
```

### 3.2 起動時のキャッシュ初期化

```
server.ts startup
  └── PlaceMemoryCache.initialize(prisma)
        ├── SELECT * FROM Place WHERE isActive=TRUE
        ├── 各レコードを normalizedName/usageCount でインデックス化
        └── isReady=true
```

失敗時は警告ログのみ出力し DB フォールバックで継続する。

---

## 4. 実装詳細

### 4.1 共通正規化モジュール

**新設**: `backend/src/_sharedTech/text/placeNormalize.ts`

`backend/infra/osm/normalize.ts` の `normalizeName` / `normalizeAddress` を共通化し、以下から import する:

- `backend/infra/osm/transform.ts` （投入時）
- `backend/src/domains/place/infrastructure/repository/PlaceRepositoryImpl.ts` （検索時）
- `backend/src/domains/place/infrastructure/cache/PlaceMemoryCache.ts` （メモリ検索時）

これにより投入時と検索時の正規化が完全に同期される（③解消）。

### 4.2 OSM抽出タグ拡張（中間スコープ）

**変更**: `backend/infra/osm/config.ts`

`EXTRACT_TAGS` に追加:

| 追加タグ                | カテゴリ判定先     | 意図                       |
| ----------------------- | ------------------ | -------------------------- |
| `amenity=arts_centre`   | `community_centre` | 文化センター系             |
| `amenity=social_centre` | `community_centre` | 公民館・地域センター       |
| `building=civic`        | `civic`            | 庁舎・公共施設の建築物単位 |
| `building=public`       | `public_building`  | 公共建築物                 |
| `office=government`     | `civic`            | 行政機関オフィス           |

`detectCategory` に上記の判定分岐を追加。`shouldExclude`（address必須）は変更なし。

### 4.3 検索 SQL 改修（フォールバック経路）

**変更**: `backend/src/domains/place/infrastructure/repository/PlaceRepositoryImpl.ts`

**重要**: Phase1 デバッグで `pg_trgm.similarity()` は日本語マルチバイトに対して 0 を返すことが判明。SQL 側はメモリキャッシュ未準備時のフォールバックとして最低限の精度を確保する。

```sql
-- 変更後
SELECT ...,
       (
           CASE WHEN "normalizedName" LIKE $2 THEN 0.5 ELSE 0 END  -- prefix
         + CASE WHEN "normalizedName" LIKE $3 THEN 0.2 ELSE 0 END  -- contains
         + (LOG(10, 1 + "usageCount"::numeric)) * 0.1
         + (1.0 / GREATEST(1, LENGTH("normalizedName"))) * 0.05    -- 短い名前を僅かに優遇
       ) AS "score"
FROM "Place"
WHERE "isActive" = TRUE
  AND ("normalizedName" LIKE $2 OR "normalizedName" LIKE $3)  -- prefix or contains
ORDER BY "score" DESC
LIMIT $4
```

similarity 条件は削除（pg_trgm が日本語で効かないため）。

### 4.4 PlaceMemoryCache（全件オンメモリ）

**新設**: `backend/src/domains/place/infrastructure/cache/PlaceMemoryCache.ts`

**重要**: pg_trgm が日本語に効かないため、TS 側で **char-bigram (n-gram=2) Jaccard 類似度** を独自実装する。日本語の「文化センター」「コミュニティセンター」のような表記揺れにも効く。

```typescript
class PlaceMemoryCache {
    private static instance: PlaceMemoryCache | null = null
    private records: PlaceCacheRecord[] = []
    private ready = false

    static get(): PlaceMemoryCache
    async initialize(prisma: PrismaClient): Promise<void>  // 起動時1回
    async reload(prisma: PrismaClient): Promise<void>       // 月次ジョブ後
    isReady(): boolean
    search(query: string, limit: number): PlaceSearchResult[]
    incrementUsage(id: string): void                        // メモリ側カウンタ更新
}
```

**search ロジック（TS 内で再現）**:

1. 共通正規化モジュールで `query` を正規化
2. 全レコードをループし、以下のいずれかを満たすものを候補化
   - `record.normalizedName` が `query` で前方一致
   - `record.normalizedName` が `query` を部分一致で含む
   - `bigramJaccard(record.normalizedName, query) > 0.2`
3. スコア計算
   ```
   score = (前方一致 ? 0.5 : 0)
         + (部分一致 ? 0.2 : 0)
         + bigramJaccard * 0.4
         + log10(1 + usageCount) * 0.1
         + (1 / max(1, normalizedName.length)) * 0.05  // 短い名前を僅かに優遇（タイブレーク）
   ```
4. スコア降順で上位 `limit` 件返却

**容量見積**: 34,970件 × 約500B = 約17MB（Node.js プロセスで許容範囲）

**bigram 類似度 (Jaccard)**:
- pg_trgm が日本語に効かない問題を回避するため、char-bigram (連続2文字) の集合 Jaccard 類似度を採用
- 例: 「文化センター」→ {文化, 化セ, セン, ンタ, ター}（5要素）
- `Jaccard(A, B) = |A ∩ B| / |A ∪ B|`

### 4.5 Repository キャッシュ統合

**変更**: `backend/src/domains/place/infrastructure/repository/PlaceRepositoryImpl.ts`

```typescript
async search(params): Promise<PlaceSearchResult[]> {
    const cache = PlaceMemoryCache.get()
    if (cache.isReady()) {
        return cache.search(params.query, params.limit)
    }
    // フォールバック: 既存 SQL 検索
    return this.searchByDB(params)
}

async incrementUsageCount(id: string): Promise<void> {
    await this.prisma.place.update({ ... })
    PlaceMemoryCache.get().incrementUsage(id)
}
```

### 4.6 起動シーケンス

**変更**: `backend/src/api/server.ts`

`AppSecretsLoader.load()` 完了後、Bootstrap 群の前に下記を呼ぶ:

```typescript
await PlaceMemoryCache.get().initialize(prisma)
```

失敗時は warn ログのみで継続（DB フォールバック有効）。

### 4.7 フロントUI

**変更**: `frontend/src/features/activity/components/PlaceCombobox.tsx`

削除する要素:
- `placeId && inputValue` 時の MapPin チップブロック
- `inputValue.trim().length >= 2 && !placeId` 時の注意文言ブロック
- 不要になった `MapPin` import（`X` は残す）

---

## 5. デバッグ・検証スクリプト

### 5.1 `backend/scripts/debug-place-search.ts`（新設）

- 「国分寺」「文化センター」「国分寺台文化センター」「コミュニティセンター」のヒット件数・上位20件・スコアを表示
- 全件数とカテゴリ別分布を表示
- pg_trgm の similarity 値を直接計算し、閾値別ヒット数を比較

実行: `cd backend && set -a && source env/.env.local && set +a && pnpm dlx tsx scripts/debug-place-search.ts`

---

## 6. 運用

### 6.1 月次最新化ジョブとの結合

CF-5 月次OSM最新化ジョブ完了後、以下のいずれかでキャッシュをリロードする:

- 案A: ジョブ完了時に `POST /v1/admin/places/reload-cache`（管理者APIキー認証）を叩く
- 案B: アプリプロセスを再起動する（k8s rolling update 等）

**今回はAPI実装はスコープ外**（プロセス再起動で当面運用）。月次ジョブ実装時に判断。

### 6.2 起動時間への影響

34,970件のロード + 正規化キャッシュ生成に 1-3 秒想定。`/health` エンドポイントは即返るが、`/v1/places/search` は cache 未準備時 DB フォールバックで応答可能。

---

## 7. リスクと対策

| リスク                                      | 対策                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| TS 自前 trigram と pg_trgm の順位が乖離する | 検証: Phase1 デバッグで両者比較。乖離が大きければ pg_trgm 互換実装に修正 |
| メモリ膨張（10万件超でも問題ないか）        | 計測ログで RSS を確認。50万件超になる場合は LRU or sharding 検討（将来） |
| 多プロセス構成時のキャッシュ非整合          | 現状は単一プロセス。将来複数化する場合はキャッシュリロード API + Pub/Sub |
| キャッシュリロード時の競合                  | `reload()` は新インスタンス構築後にアトミックスワップで対応              |

---

## 8. テスト戦略

| レイヤ           | 方針                                                               |
| ---------------- | ------------------------------------------------------------------ |
| 共通正規化       | 単体テスト（投入時/検索時で同一入力→同一出力）                     |
| PlaceMemoryCache | 単体テスト（trigram 類似度、スコア計算、reload の原子性）          |
| Repository       | キャッシュ Ready/Not-Ready の両ルート確認                          |
| 手動E2E          | 「国分寺」「文化センター」「コミュニティセンター」での候補表示確認 |

ユニットテスト追加は別タスク（本対応はロジック実装と動作確認まで）。

---

## 9. 変更ファイル一覧

| 種別 | ファイル                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 新設 | `backend/src/_sharedTech/text/placeNormalize.ts`                                                         |
| 新設 | `backend/src/domains/place/infrastructure/cache/PlaceMemoryCache.ts`                                     |
| 新設 | `backend/scripts/debug-place-search.ts`                                                                  |
| 変更 | `backend/infra/osm/normalize.ts` （共通モジュール re-export 化）                                         |
| 変更 | `backend/infra/osm/config.ts` （EXTRACT_TAGS 拡張、detectCategory 拡張）                                 |
| 変更 | `backend/src/domains/place/infrastructure/repository/PlaceRepositoryImpl.ts` （SQL改修・キャッシュ統合） |
| 変更 | `backend/src/api/server.ts` （起動時 PlaceMemoryCache.initialize 呼び出し）                              |
| 変更 | `frontend/src/features/activity/components/PlaceCombobox.tsx` （注意文言・チップ削除）                   |

---

## 10. 後続課題（バックログ）

- 管理者向け `POST /v1/admin/places/reload-cache` API の実装（CF-5 月次ジョブ実装時）
- pg_trgm 互換 trigram 実装への精度向上（現状は Jaccard ベース簡易版）
- ユニットテスト追加（PlaceMemoryCache, 共通正規化）
- 国名以外の地名表記揺れ対応（送り仮名違い等）
