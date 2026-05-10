# Phase 8 — 問い合わせフォーム実装（W6-12）

> **最終更新**: 2026-04-27
> **ステータス**: ✅ Phase 8-A / 8-B / 8-C 実装完了（添付関連は Phase 8-B-2 として後送）
> **同時実装**: Phase 7 / Phase 9 と並列実施。本Phaseは A → B → C のサブ順で進行。
> **テスト観点**: [projects/02_tests/wave6/phase8-tests.md](../../02_tests/wave6/phase8-tests.md)
> **詳細手順**: [phase8a-system-admin-role.md](./phase8a-system-admin-role.md)

## フェーズ概要
- **ゴール**: 問い合わせ機能を「認可基盤 + 機能本体 + 最小管理画面」の三層で完成させる。プラットフォーム管理者（SystemAdmin）の概念を本Waveで導入する。
- **対象**: W6-12（および本Phase内で SystemAdmin ロール基盤を新設）
- **変更対象レイヤー**: DB / API / UseCase / Domain / Storage / FE（一般+管理者）

## サブフェーズ構成

### Phase 8-A : SystemAdmin ロール基盤 ✅ 完了
| タスク                                                    | 状態   | 備考                                                                |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `User.systemRole` カラム追加（USER/OPERATOR/SUPER_ADMIN） | ✅ 完了 | String 型 + DEFAULT 'USER'。手動 SQL + `migrate resolve` で適用     |
| 認可ミドルウェア `requireSystemAdmin`                     | ✅ 完了 | DB lookup 方式（JWT に systemRole を入れない）。未認可は 404        |
| FE 側 `AdminProtectedRoute`                               | ✅ 完了 | `useAuth().user.systemRole` で判定。未認可は NotFoundPage 描画      |
| `/admin/*` ルート骨格の追加                               | ✅ 完了 | `/admin` プレースホルダ画面 (`AdminHomePage`) 追加                  |
| `/v1/auth/me` レスポンスに `systemRole` 追加              | ✅ 完了 | FE の `AuthMeResponse` / `AuthUser` 型も同期                        |
| seed/手動付与手順ドキュメント                             | ✅ 完了 | `e2e-seed-data.sql` に Operator/SuperAdmin 2 名追加 + 運用 SQL 同梱 |

### Phase 8-B : 問い合わせ機能本体 ✅ 完了（添付関連を除く）
| タスク                                                | 状態     | 備考                                                                 |
| ----------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| Inquiry スレッドモデル設計（4 テーブル）              | ✅ 完了   | `Inquiry / InquiryAttachment / InquiryMessage / InquiryCategory`     |
| 関連: `HelpFeedback` / `HelpSubscription` テーブル    | ✅ 完了   | `20260427110000_wave6_w6_phase8b_inquiry_help` に同梱                |
| Inquiry API（作成/一覧/詳細）                         | ✅ 完了   | `inquiryController.ts`、認証ユーザーは自分の問い合わせのみ           |
| 匿名ログイン障害ルート（`/contact/anonymous`）        | ✅ 完了   | reCAPTCHA(no-op fallback) + メアド必須 + isAnonymousOnly カテゴリ    |
| 問い合わせフォーム（カテゴリ/タイトル/内容/添付）     | ✅ 完了   | `?category=...&articleSlug=...` プレフィル対応（添付UIは未実装）     |
| 履歴画面（`/mypage/inquiries`）                       | ✅ 完了   | スレッド表示、運営返信を時系列で                                     |
| アプリ内通知（運営返信時）                            | ✅ 完了   | `notifyUserOfOperatorReply` で Notification 直書き                   |
| Slack 通知（新規問い合わせ時）                        | ✅ 完了   | `SLACK_INQUIRY_WEBHOOK_URL` 未設定時は no-op                         |
| 添付: マルチ形式 + ウイルススキャン + 保持期間 180 日 | 🔜 後送り | **Phase 8-B-2** として後続Wave／UI上「後続リリースで対応予定」と明記 |
| レート制限（IP + ユーザー単位）                       | ✅ 完了   | `express-rate-limit` 新規導入、anonymous(IP/h:5)+auth(user/h:30)     |

### Phase 8-C : 最小管理画面（`/admin/inquiries`） ✅ 完了
| タスク                                         | 状態     | 備考                                                                                         |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| 一覧画面（フィルタ: status / category / 期間） | ✅ 完了   | `AdminInquiriesPage`、OPERATOR以上で閲覧可                                                   |
| 詳細画面（スレッド表示 + 添付プレビュー）      | ✅ 完了   | `AdminInquiryDetailPage`、InquiryMessage 全件表示                                            |
| ステータス変更（OPEN/IN_PROGRESS/RESOLVED）    | ✅ 完了   | `PATCH /v1/admin/inquiries/:id/status`（監査ログは後送り）                                   |
| 運営返信投稿（InquiryMessage 追加）            | ✅ 完了   | 投稿時にユーザーへアプリ内通知を自動送信                                                     |
| AppLayout の管理画面用バリアント               | 🔜 後送り | 通常レイアウトと共用。HamburgerMenu 側で「運営トップ」「問い合わせ管理」を表示することで代用 |

> ⚠ 添付ファイル / ClamAV / 保持期間ジョブは **Phase 8-B-2** として後送り。UI 上にも「添付は後続リリースで対応予定」と明記済み。
> ⚠ Inquiry 機能は納期圧縮のため controller + Prisma 直書きの暫定実装。DDD レイヤ化リファクタは **ideabox I-11** として記録済み。

## 確定設計（Q&A 反映）

### Q8 → 認証要否：原則認証必須 + 匿名ログイン障害ルート
- 通常: `/contact` は認証必須、ユーザーIDが Inquiry に紐付く
- 例外: `/contact/anonymous` は reCAPTCHA + メアド + カテゴリ「ログイン・登録の不具合」固定
- 匿名 Inquiry は `userId = NULL`, `contactEmail` 必須、運営返信はメール送信のみ

### Q9 → データモデル：スレッドモデル
```
Inquiry (id, userId?, contactEmail?, categoryId, title, status, createdAt, ...)
  ├─ InquiryMessage (id, inquiryId, authorType: USER|OPERATOR, authorUserId?, body, createdAt)
  └─ InquiryAttachment (id, messageId, storageKey, mimeType, sizeBytes, scanStatus, ...)
InquiryCategory (id, slug, labelI18n: JSON, relatedHelpCategoryId?, sortOrder, isActive)
```
- 初回送信は `messages = [USERメッセージ1件]` で作成
- 運営返信・ユーザー追記が同テーブルに追加されるのみ
- 添付は Message 単位で 1:N

### Q10 → カテゴリ管理：マスタテーブル + Help 参照 + i18n
- `InquiryCategory.relatedHelpCategoryId` で Phase 7 のヘルプカテゴリと紐付け
- ヘルプ記事フィードバックから問い合わせ遷移時、関連カテゴリを自動選択
- ラベルは i18n JSON で保持

### Q11 → 添付仕様：マルチ形式 + スキャン + 保持期間
- 拡張子: 画像（jpg/png/gif/webp）/ 動画（mp4/mov、〜30 秒）/ PDF / テキスト（txt/log）
- 上限: 20 MB × 5 ファイル
- ウイルススキャン: ClamAV（または同等）でアップロード時にスキャン、`scanStatus: PENDING/CLEAN/INFECTED`
- 保持期間: 180 日（Inquiry が RESOLVED から 180 日経過で添付を S3 から削除、メタは残す）

### Q12 → 送信後体験：履歴 + アプリ内通知 + メール自動返信
- 送信完了画面 → 履歴画面への導線
- マイページ配下に「問い合わせ履歴」追加（スレッド一覧 + 個別詳細）
- 運営返信時: アプリ内通知 + メール送信（ユーザー設定で OFF 可能）

### Q13 → 運営対応フロー：ε（最小管理画面 + SystemAdmin ロール基盤）
- 同一フロントアプリ内に `/admin/inquiries` を実装（C1:A）
- 権限判定は `User.systemRole` ベース、付与は手動 SQL/seed（C2:A）
- 機能スコープ: 一覧 + ステータス変更 + 返信投稿（13-d:C）
- 担当者割当・SLA・タグ・統計は本Wave対象外（後続Waveでバックログ化）

## 依存関係
- **Phase 7**: HelpFeedback / HelpSubscription を本Phase 8-B のマイグレーションに同梱。
- **Phase 9**: ハンバーガーメニューに「問い合わせ」「マイ問い合わせ履歴」、SystemAdmin には「管理メニュー > 問い合わせ管理」を追加（権限別表示制御）。
- **既存基盤**: `frontend/src/shared/lib/uploadClient.ts` / `backend/src/_sharedTech/storage/S3FileStorageService.ts` を再利用。

## 実装前チェックリスト
- [x] 問い合わせカテゴリ初期値方針確定（マスタテーブル化、Help カテゴリ参照、i18n）
- [x] 添付ファイル制限確定（マルチ形式 / 20MB×5 / スキャン / 保持 180 日）―設計完了、実装は Phase 8-B-2
- [x] DB スキーマ方針確定（スレッドモデル + InquiryCategory マスタ + Help 関連テーブル）
- [x] 管理者通知方式確定（Slack 通知 + アプリ内通知、自動返信メールは後送り）
- [x] 認可基盤方針確定（SystemAdmin ロール導入、`requireSystemAdmin` ミドルウェア）
- [x] Prisma スキーマ草案作成―マイグレーション適用済 (`20260427110000_wave6_w6_phase8b_inquiry_help`)
- [ ] ウイルススキャン基盤の選定（ClamAV vs 外部 API） ― Phase 8-B-2
- [ ] 保持期間ジョブの実装方式確定（既存 outbox/cron 流用） ― Phase 8-B-2
- [x] reCAPTCHA キー発行 + 環境変数設計―`RECAPTCHA_SECRET` 未設定時は no-op fallback、本番キー発行は Phase 10 リリース準備で
- [x] InquiryCategory 初期値リスト作成―マイグレーションで 8 件投入済

## 受入条件
- [x] 認証ユーザーが問い合わせを送信し、履歴画面で確認できる
- [x] 匿名ユーザーが reCAPTCHA を経て「ログイン障害」カテゴリで送信できる（local では no-op fallback）
- [ ] 添付ファイルがスキャンされ、INFECTED は拒否される ― Phase 8-B-2
- [x] Slack に新規問い合わせ通知が届く（`SLACK_INQUIRY_WEBHOOK_URL` 未設定時は no-op）
- [x] SystemAdmin が `/admin/inquiries` で一覧/詳細/ステータス変更/返信ができる
- [x] 運営返信時、ユーザーにアプリ内通知が届く（メール送信は後送り）
- [x] 非 SystemAdmin が `/admin/*` にアクセスすると 404 になる
- [ ] 保持期間 180 日経過の添付が自動削除される（バッチ動作確認） ― Phase 8-B-2
- [x] BE/FE 共に `tsc` クリーン（Wave6 関連は新規エラー 0、既存負債 8 件は本Wave対象外）

## スコープ外（後続Waveバックログ）
- 担当者割当・SLA・タグ・統計
- BAN/モデレーション機能、監査ログ画面
- SystemAdmin ロール付与 UI（初期は手動 SQL/seed 運用）
- **Phase 8-B-2**: 添付ファイル UI / アップロード / ClamAV / 保持期間 180 日ジョブ
- **ideabox I-11**: Inquiry機能のDDDレイヤ化リファクタ（暫定でcontroller+prisma直書き）

## 作業ログ
- 2026-04-25: 現状調査を実施。問い合わせ機能は未実装、既存アップロード基盤の再利用余地を確認。
- 2026-04-27: Q&A 6 項目（Q8-Q13）+ 補助 4 項目（C1-C4）を確定。Phase 8 を A:認可基盤 / B:機能本体 / C:最小管理画面 にサブ分割。SystemAdmin ロールを本Waveで導入し、初期付与は手動 SQL/seed 運用とする方針で確定。
- 2026-04-27: **Phase 8-A 完了**。`User.systemRole` カラム追加（手動 SQL + `migrate resolve`、シャドウDB既存負債のため）、`requireSystemAdmin` ミドルウェア、`AdminProtectedRoute`、`/admin` ルート骨格、`/v1/auth/me` への `systemRole` 追加、Operator/SuperAdmin テストユーザー追加。BE/FE tsc 検証クリア（既存負債の TS6133 除く）。詳細: [phase8a-system-admin-role.md](./phase8a-system-admin-role.md)
- 2026-04-27: **Phase 8-B BE 完了**。schema 6テーブル追加 / `inquiryController.ts` / `inquiryNotificationService.ts` / `recaptchaVerifier.ts` / `inquiryRoutes.ts`（`express-rate-limit` 新規導入、anonymous(IP/h:5)+auth(user/h:30)）。BE tsc クリア。
- 2026-04-27: **Phase 8-B FE 完了**。`inquiryApi` / `ContactPage` / `AnonymousContactPage` / `MyInquiriesPage` / `MyInquiryDetailPage`。
- 2026-04-27: **Phase 8-C 完了**。`AdminInquiriesPage` / `AdminInquiryDetailPage`（一覧・詳細・ステータス変更・運営返信）。App.tsxにルート 4 本追加、FE tsc クリア（Wave6 関連は新規エラー 0）。
- 2026-05-03: 実装前チェックリストと受入条件を同期化。未実施項目は Phase 8-B-2 タグを付けて明示。
