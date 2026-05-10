# Wave6 — 初期バージョン完成向け統合スコープ

> **最終更新**: 2026-04-27
> **ステータス**: 🚧 Phase 1〜6 完了 / Phase 7〜9 実装完了（添付/Markdown化/バッジは後続バックログ）/ Phase 10 未着手

## 概要

Wave5からの指摘事項（`wave5-carry-over.md`）と、計画的先送りタスク（旧W6-01）をWave6に統合済み。
本Waveでは、初期バージョン完成を優先し、**対象タスクは全件Wave6で実装**する。

本ファイルは統合インデックスとして運用し、各Phaseの詳細は `phaseX-progress.md` に分割管理する。

---

## 実装対象一覧（Wave6 全件実装）

| #   | ID    | タイトル                                                      | 種別       | 優先度 | 規模 | 由来                      |
| --- | ----- | ------------------------------------------------------------- | ---------- | ------ | ---- | ------------------------- |
| 1   | W6-01 | サブコミュニティのブックマーク有効化（コミュニティ一覧）      | 改修       | P1     | M    | wave5 carry-over [1]      |
| 2   | W6-02 | コミュニティ設定画面の外部連携タブ削除（クレカ連携以外）      | 改修       | P2     | S    | wave5 carry-over [2]      |
| 3   | W6-03 | 変更履歴等の物理名表示を論理名表示へ統一                      | 改修       | P1     | M    | wave5 carry-over [3]      |
| 4   | W6-04 | 非加入コミュニティ/非公開アクティビティへのURL遷移制御        | 不具合修正 | P0     | L    | wave5 carry-over [4]      |
| 5   | W6-05 | コミュニティツリー画面にサブコミュニティ作成ボタン追加        | 改修       | P2     | S    | wave5 carry-over [5]      |
| 6   | W6-06 | アクティビティ履歴入力日付の任意入力対応                      | 改修       | P2     | S    | wave5 carry-over [6]      |
| 7   | W6-07 | 開催場所入力の住所候補表示＋項目統合（開催場所住所を統合）    | 機能改善   | P1     | L    | wave5 carry-over [7]      |
| 8   | W6-08 | 中止アクティビティの中止取り消し対応                          | 機能改善   | P1     | M    | wave5 carry-over [8]      |
| 9   | W6-09 | アクティビティ中止時のお知らせ投稿不具合修正                  | 不具合修正 | P0     | M    | wave5 carry-over [9]      |
| 10  | W6-10 | アクティビティ削除時はお知らせ投稿オプションを非表示化        | 改修       | P1     | S    | wave5 carry-over [10]     |
| 11  | W6-11 | ヘルプ画面新規実装（カテゴリ展開式・内容は準備中）            | 新機能     | P2     | M    | wave5 carry-over [10]※    |
| 12  | W6-12 | 問い合わせフォーム新規実装（カテゴリ/タイトル/内容/添付）     | 新機能     | P1     | L    | wave5 carry-over [11]     |
| 13  | W6-13 | ハンバーガーメニュー新規実装（マイページ/ヘルプ導線）         | 新機能     | P2     | M    | wave5 carry-over [12]     |
| 14  | W6-14 | 便利機能（乱数表・組み合わせ・得点記録・トーナメント/リーグ） | 新機能     | P3     | XL   | wave4 W4-06 → wave5 W5-02 |

---

## Phaseファイル一覧

| Phase   | 目標                                                           | 対象タスク          | 詳細                                       |
| ------- | -------------------------------------------------------------- | ------------------- | ------------------------------------------ |
| Phase1  | セキュリティ/遷移制御の先行安定化                              | W6-04               | [phase1-progress.md](phase1-progress.md)   |
| Phase2  | コミュニティ導線・設定の改善                                   | W6-01, W6-02, W6-05 | [phase2-progress.md](phase2-progress.md)   |
| Phase3  | 表示品質と監査情報の改善                                       | W6-03               | [phase3-progress.md](phase3-progress.md)   |
| Phase4  | アクティビティ運用改善（入力/取消）                            | W6-06, W6-08, W6-10 | [phase4-progress.md](phase4-progress.md)   |
| Phase5  | アクティビティ通知連携の修正                                   | W6-09               | [phase5-progress.md](phase5-progress.md)   |
| Phase6  | 開催場所入力UX改善（候補表示/項目統合）                        | W6-07               | [phase6-progress.md](phase6-progress.md)   |
| Phase7  | ヘルプ画面実装と導線定義                                       | W6-11               | [phase7-progress.md](phase7-progress.md)   |
| Phase8  | 問い合わせフォーム実装（A:認可基盤 / B:機能 / C:最小管理画面） | W6-12               | [phase8-progress.md](phase8-progress.md)   |
| Phase9  | ハンバーガーメニュー実装                                       | W6-13               | [phase9-progress.md](phase9-progress.md)   |
| Phase10 | 便利機能ドメイン設計〜実装〜総合検証                           | W6-14               | [phase10-progress.md](phase10-progress.md) |

---

※ `wave5-carry-over.md` 原文にて [10] が W6-10（削除時通知UI）と W6-11（ヘルプ画面）の双方に振られている。本Waveでは別タスクとして扱う。

---

## 横断設計課題（全Phase共通）

- 認可モデル統一: Community/Activity/Scheduleの閲覧権限を「会員」「公開」「管理者」で共通化する。
- 通知ポリシー統一: `announcement / push_only / none` とUI表示の整合をとる。
- 添付ファイルポリシー: ファイル種別・容量・保持期間・削除ルールを共通化する。
- 監査ログ運用: 物理名→論理名のマッピング責務（FE/BE）を定義し、更新ルールを決める。
- DDD境界維持: UI/API/UseCase/Domain/DBを越える仕様は shared module で型を同期する。

---

## Phase 7〜9 同時実装方針（2026-04-27 確定）

本Waveの初期版完成度を最大化するため、Ph7（ヘルプ）/ Ph8（問い合わせ）/ Ph9（ハンバーガーメニュー）を同時実装する。共通基盤（AppLayout情報設計・ルーティング・認可方針）を先行確定し、機能レーンを並列で進める。

### 共通基盤（先行確定事項）
- ヘッダー右側は「タイトル + 通知ベル + ハンバーガー」に整理し、アバター/ログアウト/プラン管理等はメニューに集約する（Q15:C）。
- ハンバーガーはモバイル=Drawer / デスクトップ=Dropdown のレスポンシブ切替（Q14:C）。a11y完全対応（Q18:C）。
- ルーティング: `/help`（公開、audience別表示制御）、`/help/:categoryId`、`/help/:categoryId/:articleSlug`（Q6:C / Q7:C）。`/contact`（認証必須）、`/contact/anonymous`（ログイン障害向け、reCAPTCHA保護）（Q8:C）。`/admin/*`（SystemAdmin専用、`AdminProtectedRoute`でガード）（C1:A）。
- 認可: `User.systemRole = USER | OPERATOR | SUPER_ADMIN` を新設。初期付与はseed + 手動SQL運用（C2:A）。
- メニュー初期構成（Q16:C）: プロフィールヘッダー / マイページ / 通知設定 / プラン管理 / ヘルプ / 問い合わせ / 利用規約・プライバシー / アプリバージョン / ログアウト + 集約バッジ + 項目別バッジ（Q17:C）。

### 実装順（レーン別）
1. 共通基盤レーン: `User.systemRole` マイグレーション + `AdminProtectedRoute` + AppLayoutシェル更新（ヘッダー再配置 + ハンバーガー骨格）。
2. Ph7レーン（並列）: Markdown同梱（i18nロケール別ディレクトリ）+ 2階層IA + 検索/最近見た/URL fragment + status/expectedReleaseAt/notifyMe（Phase8の通知連携必須）+ 記事フィードバック。
3. Ph8-Aレーン（並列）: SystemAdminロール基盤（DB/認可ミドルウェア/seed）。
4. Ph8-Bレーン（Aの後）: Inquiry スレッドモデル（`Inquiry / InquiryAttachment / InquiryMessage / InquiryCategory`）+ API + FEフォーム + 履歴画面 + アプリ内通知 + 匿名ログイン障害ルート + Slack通知 + ウイルススキャン + 保持期間ジョブ。
5. Ph8-Cレーン（A/B後）: `/admin/inquiries` 最小管理画面（一覧 + ステータス変更 + 返信投稿）。
6. Ph9レーン（並列）: ハンバーガー本実装 + メニュー項目の権限別表示制御 + バッジ集約hook。
7. 統合検証: Ph9メニュー → Ph7/Ph8/管理画面の全導線、認可境界、a11y、未認証時挙動。

### 競合点と回避
- **AppLayout二重改修**: 共通基盤レーンでヘッダー再設計を先行確定し、Ph7/Ph9は差分追加のみとする。
- **認証モデル分散**: Q8とSystemAdmin判定を `AuthProvider`/ミドルウェアに集約し、各Phaseは判定結果を受け取るのみ。
- **カテゴリ体系**: Help カテゴリ（行動軸）と Inquiry カテゴリ（問題軸）を分離しつつ、`Inquiry.relatedHelpCategoryId` で参照可能にする（Q5/Q10）。

### スコープ外（後続Wave送り）
- 担当者割当・SLA・タグ・統計（管理画面の高度機能）
- BAN/モデレーション機能、監査ログ画面
- SystemAdminロール付与UI（C2:A 採用のため初期は手動）
- ヘルプCMS化（Q1:B採用、運用拡大時に検討）

---

## 作業ログ

- 2026-04-12: Wave6 overview 作成。Wave5 W5-02（便利機能）を要件定義未了のため Wave6 へ移管。
- 2026-04-25: `wave5-carry-over.md` と統合。Wave5指摘 + 追加実装 + 旧W6-01を全件Wave6スコープ化し、Phase1〜10計画を策定。
- 2026-04-25: `overview.md` をインデックス化し、`phase1-progress.md` 〜 `phase10-progress.md` へ分割管理開始。
- 2026-04-25: 表記統一（Phase5の状態記号を `🚧 作業中` に統一、由来重複の注記追加）と、各Phaseに「要件整理ポイント（未確定事項）」セクションを追記。
- 2026-04-27: Phase6（W6-07）完了。開催場所検索の後続改善（重複排除、全件キャッシュ、住所欠落許容でのマスタ拡張、UI改善）を反映し、実機動作確認まで完了。OpenStreetMap クレジット表示を開催場所関連UIに追加。
- 2026-03-04: Phase 1〜5 を完了。BE/FE 共に `tsc` クリーン。
  - Phase1 W6-04: Activity.visibility / 認証経由の Find/List / FE 404 redirect / seed 拡張
  - Phase2 W6-01/02/05: SubCommunity 一覧の bookmark/最新お知らせ統合 + CommunityCard 共通化 / Webhook タブ削除 / SubCommunity 作成 CTA
  - Phase3 W6-03: `frontend/src/shared/audit-labels` 共通化 + `scripts/check-audit-labels.mjs` CI で物理⇄論理同期保証
  - Phase4 W6-06/08/10: 履歴モーダル開催日入力 / 中止スケジュール復元（Payment 紐付き不可・サイレント）/ 削除時 notifyOption 二重ガード
  - Phase5 W6-09: 通知 audience に Waitlist 追加・単発/全件/Activity全体で文言分岐・UI ラベル刷新
- 2026-04-27: Phase 7〜9 を同時実装する方針を策定。Q&A 全18 項目 + 追加4項目を確定（理想形採用、Q13は ε:最小管理画面+SystemAdminロール基盤）。Ph8 を A:認可基盤 / B:機能 / C:最小管理画面 にサブ分割。テスト観点ドキュメントは `projects/02_tests/wave6/` にWave単位で集約。
- 2026-04-27: Phase 7〜9 実装完了。
  - Phase 8-A: SystemAdmin ロール基盤（User.systemRole / requireSystemAdmin / AdminProtectedRoute / `/admin` 骨格 / seed 2名追加）
  - Phase 8-B: Inquiry系6テーブル + Controller(controller直書き) + Slack通知 + アプリ内通知 + reCAPTCHA(no-op fallback) + rate-limit + ContactPage / AnonymousContactPage / MyInquiriesPage / MyInquiryDetailPage
  - Phase 8-C: AdminInquiriesPage / AdminInquiryDetailPage（一覧・詳細・ステータス変更・運営返信）
  - Phase 9: ui/sheet.tsx + HamburgerMenu（プロフィール+13項目近く+運営セクション+アプリバージョン）+ AppLayout 再設計（アバター直接遷移廃止・未認証ヘッダー対応）
  - Phase 7: helpContent.ts レジストリ（4カテゴリ×サンプル記事）+ HelpTopPage / HelpCategoryPage / HelpArticlePage（audience判定・簡易検索・最近見た・draftバッジ+notifyMe・記事フィードバック・問い合わせ導線3系統）
  - 後送り: 添付/ClamAV/保持期間ジョブ（Phase 8-B-2）/ Markdown同梱・Vite loader・Fuse.js（Phase 7-2）/ useMenuBadges（Phase 9-2）/ DDDレイヤ化（ideabox I-11 追加）
  - 検証: BE tsc / FE tsc クリア（Wave6 関連は新規エラー 0、既存負債 8 件は本Wave対象外）
