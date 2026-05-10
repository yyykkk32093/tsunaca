# Phase 3 — 表示品質と監査情報の改善（W6-03）

> **最終更新**: 2026-04-25
> **ステータス**: ✅ Phase 3 完了

## フェーズ概要
- **ゴール**: 物理名表示を排除し、ユーザー向け文言で統一する。今後の監査UI追加時に再利用できる共通辞書を整備する。
- **対象**: W6-03
- **変更対象レイヤー**: UI / shared

## タスク一覧

| タスク                                                   | 状態   | 備考                                                        |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| 共通辞書モジュール `shared/audit-labels` を新設          | ✅ 完了 | 物理→論理 / 物理値→論理値 / `formatAuditSummary` を一括提供 |
| `CommunitySettingsPage` のインライン辞書を共通辞書に置換 | ✅ 完了 | 重複コードを削除し import 1 行で置換                        |
| 不明項目フォールバック（`不明な項目({物理名})` + warn）  | ✅ 完了 | `humanizeAuditField` で実装                                 |
| Prisma Community model vs 辞書 の差分検出 CI スクリプト  | ✅ 完了 | `scripts/check-audit-labels.mjs`、現状 0 件で OK            |

## 確定した設計

### 共通辞書 `frontend/src/shared/audit-labels/index.ts`
- `AUDIT_FIELD_LABELS`: 物理フィールド名 → 日本語ラベル
- `AUDIT_VALUE_LABELS`: 物理値（enum/boolean/曜日等）→ 日本語ラベル
- `humanizeAuditValue(raw)`: カンマ区切り対応の値変換、`null/''` → `'なし'`
- `humanizeAuditField(physical)`: 未登録時は `不明な項目(xxx)` + `console.warn`
- `formatAuditSummary(log)`: summary 内の物理名置換 + `before → after` 付与（画像系は除外）

### CI スクリプト `scripts/check-audit-labels.mjs`
- `backend/prisma/schema.prisma` の Community model フィールドを抽出
- `AUDIT_FIELD_LABELS` のキーを抽出
- 差分があれば exit 1（CI failure）。技術フィールド/関係性は IGNORED_FIELDS で除外。

## 監査UI適用状況

| 画面                            | 状態           | 備考                                          |
| ------------------------------- | -------------- | --------------------------------------------- |
| Community設定変更履歴           | ✅ 共通辞書適用 | `CommunitySettingsPage` から共通辞書を import |
| Participation/Waitlist 監査ログ | 該当画面なし   | BE モデルは存在するが FE UI 未実装            |
| Auth 監査ログ                   | 該当画面なし   | BE モデルは存在するが FE UI 未実装            |

## 受入条件
- [x] ユーザー向け画面で物理名が露出しない
- [x] before/after 値も論理的に読める形で表示される
- [x] 新規項目追加時の追従手順を CI で機械検出可能
- [x] 共通辞書化により今後の監査UI追加時に再利用可能

## 残課題
- Participation/Waitlist/Auth 監査ログの FE UI は今回スコープ外。実装時には共通辞書を使うこと。

## 作業ログ
- 2026-04-25: 現状調査を実施。Community設定履歴の変換実装を確認、横断適用範囲の要件確定待ち。
- 2026-04-25: 共通辞書モジュール `shared/audit-labels` を新設し、`CommunitySettingsPage` を共通辞書経由に置き換え。
- 2026-04-25: CI スクリプト `scripts/check-audit-labels.mjs` を新設。Community model 全フィールドが辞書に登録済みを確認（exit=0）。Phase 3 完了。
