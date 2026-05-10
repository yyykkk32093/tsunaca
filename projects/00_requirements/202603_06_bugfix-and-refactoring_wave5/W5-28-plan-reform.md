# W5-28 プラン改革 — Lifetime表示期間制御 + Subscriber→Lite/Pro分割

> **最終更新**: 2026-04-19
> **ステータス**: ✅ 完了

## 概要
- **ゴール**: プラン体系の刷新（Lifetime 販売期間制御 + Subscriber の Lite/Pro 分割）
- **対象**: バックエンド + フロントエンド（全レイヤー）
- **由来**: wave4 carry-over [15][16]

---

## 確定済み設計判断

### [15] Lifetime プラン表示期間制御

| #   | 論点                         | 決定                                                     |
| --- | ---------------------------- | -------------------------------------------------------- |
| 1   | DB設計                       | PlanMaster テーブル新設（availableFrom/availableTo含む） |
| 2   | 表示制御ロジック             | APIでフィルタリング（サーバー時刻で判定）                |
| 3   | 既存 Lifetime 購入者への影響 | 購入画面のみ非表示。既存ユーザーの機能は変更なし         |

### [16] Subscriber → Lite / Pro 分割

| #   | 論点                         | 決定                                                   |
| --- | ---------------------------- | ------------------------------------------------------ |
| 4   | DB変更                       | PlanMasterテーブル化 + User.planはstring維持           |
| 5   | 既存ユーザーマイグレーション | SUBSCRIBER → Pro 自動移行（SQL UPDATE）                |
| 6   | RevenueCat連携               | 既存pro entitlement → PRO。新規lite entitlement追加    |
| 7   | 機能制限マトリクス           | Lite = FREE + AD_FREE のみ（他はFREE同等）             |
| 8   | プラン名称                   | Lite / Pro（英語）                                     |
| 9   | Lifetimeの位置づけ           | Pro相当（全機能）                                      |
| 10  | LITEコミュニティグレード     | FREE（isPremiumPlan()判定に変更）                      |
| 11  | 価格                         | Lite ¥160/月、Pro ¥480/月、Lifetime ¥5,980（現行維持） |

---

## タスク一覧

### Phase A: PlanMaster + ドメイン層 + API + フロントエンド

| #   | タスク                                                            | 状態   | 備考                               |
| --- | ----------------------------------------------------------------- | ------ | ---------------------------------- |
| A-1 | DB: PlanMaster テーブル追加 + シードデータ                        | ✅ 完了 | マイグレーション適用済み           |
| A-2 | ドメイン層: UserPlan, PlanChangePolicy, CommunityGradePolicy 更新 | ✅ 完了 | isPremiumPlan() 追加               |
| A-3 | API: GET /v1/plans プラン一覧API新設                              | ✅ 完了 | 販売期間フィルタ付き               |
| A-4 | RevenueCat: LITE/PRO マッピング更新                               | ✅ 完了 | lite product追加対応               |
| A-5 | FE: PaywallPage API駆動化 + types/AuthProvider/useFeatureGate更新 | ✅ 完了 | 4プラン対応                        |
| A-6 | テストデータ: e2e-seed-data.sql更新                               | ✅ 完了 | PlanMaster + Helena SUBSCRIBER→PRO |

### Phase B: SUBSCRIBER 参照一掃

| #   | タスク                                         | 状態   | 備考                   |
| --- | ---------------------------------------------- | ------ | ---------------------- |
| B-1 | バックエンド全レイヤーの SUBSCRIBER → PRO 置換 | ✅ 完了 | grep確認済み: 残存ゼロ |
| B-2 | フロントエンドの SUBSCRIBER → PRO 置換         | ✅ 完了 | grep確認済み: 残存ゼロ |
| B-3 | Feature gate seed データ更新                   | ✅ 完了 | LITE レコード追加済み  |

---

## 作業ログ
- 2026-04-12: タスク分解ファイル作成
- 2026-04-19: Phase A / Phase B 全タスク完了。BE/FE ビルドクリーン
