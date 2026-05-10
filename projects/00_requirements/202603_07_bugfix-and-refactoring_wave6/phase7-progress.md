# Phase 7 — ヘルプ画面実装と導線定義（W6-11）

> **最終更新**: 2026-04-28
> **ステータス**: ✅ Phase 7 完了（Phase 7-2 残作業も実装完了）
> **同時実装**: Phase 8 / Phase 9 と並列実施（完了）
> **テスト観点**: [projects/02_tests/wave6/phase7-tests.md](../../02_tests/wave6/phase7-tests.md)

## フェーズ概要
- **ゴール**: ヘルプ画面（2階層IA + 検索 + 記事単位URL）を実装し、Phase 8 への問い合わせ導線を確保する。
- **対象**: W6-11
- **変更対象レイヤー**: UI / Routing / 静的コンテンツ（Markdown 同梱）

## タスク一覧

| タスク                                                | 状態   | 備考                                                                                                                    |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Markdown ローダ整備（Vite + frontmatter zod 検証）    | ✅ 完了 | `helpLoader.ts`: `import.meta.glob` + gray-matter + zod。`contents/ja/{cat}/*.md` 同梱                                  |
| ヘルプデータ構造定義（カテゴリ/記事/メタ）            | ✅ 完了 | `helpLoader.ts` で frontmatter から自動レジストリ生成（`helpContent.ts` は re-export）                                  |
| ルーティング追加（`/help`, `/help/:cat`, `/:slug`）   | ✅ 完了 | App.tsx に 3 ルート追加、未認証可ルート                                                                                 |
| ヘルプトップ実装（2階層IA + 検索 + 最近見た）         | ✅ 完了 | `HelpTopPage`、Fuse.js 検索、最近見た（タイトル表示）、カテゴリヘッダーに「詳しく」動線                                 |
| カテゴリ画面・記事画面実装                            | ✅ 完了 | `MarkdownRenderer`（react-markdown + GFM + rehype-slug + autolink）、prev/next、URL fragment、OGP（react-helmet-async） |
| 「準備中」表示（status=draft）の体験設計              | ✅ 完了 | バッジ + 公開予定 + notifyMe（APIは no-op fallback）                                                                    |
| 問い合わせ導線実装（下部CTA + 末尾 + フィードバック） | ✅ 完了 | 下部CTA / カテゴリ末尾 / 記事末尾 + ?category & articleSlug プレフィル                                                  |
| audience 別表示制御                                   | ✅ 完了 | `canAccess()` で public / authenticated / admin を一元判定                                                              |

## 確定設計（Q&A 反映）

### Q1 → コンテンツ管理方式：Markdown 同梱（i18n ロケール別ディレクトリ）
- 物理パス例: `frontend/src/features/help/contents/{ja,en}/{categoryId}/{articleSlug}.md`
- frontmatter: `title / slug / categoryId / audience / status / expectedReleaseAt / tags / order`
- frontmatter は zod スキーマで起動時に検証（CI でも実行）

### Q2 → カテゴリ構成：2 階層 IA
- 大カテゴリ: 「はじめに」「使い方」「困ったとき」「運営者向け」
- サブカテゴリ（ドメイン軸）: 登録・ログイン / コミュニティ / アクティビティ / お知らせ・チャット / 支払い・サブスク / 設定・通知 / その他
- 「運営者向け」の audience は `authenticated`（オーナー/管理者）でロック

### Q3 → ナビゲーション：全カテゴリ閉じ + 検索 + 最近見た + URL fragment 直リンク
- 検索: クライアントサイド全文検索（公開記事のみ）
- 最近見た: `localStorage` に直近 5 件の記事 slug を保持
- URL fragment: `/help/payments#refund-process` 形式で見出しジャンプ可能

### Q4 → 「準備中」体験：status + expectedReleaseAt + notifyMe
- `status: 'draft' | 'published'`
- draft 記事はバッジ表示 + 共通プレースホルダー + 公開予定日
- `notifyMe` ボタンで `HelpSubscription`（Phase 8 通知基盤に乗せる）に登録 → 公開時にアプリ内通知

### Q5 → 問い合わせ導線：3 系統併用
- (1) 画面下部固定 CTA「お問い合わせはこちら」
- (2) カテゴリ末尾「解決しない場合は問い合わせ」
- (3) 記事末尾「役に立った/立たなかった」フィードバック（HelpFeedback 保存）→ 立たなかった時に問い合わせ提案
- 全導線で `?category=...&articleId=...` をクエリ付与（Phase 8 でプレフィル）

### Q6 → 公開範囲：audience メタデータ
- 記事毎に `audience: 'public' | 'authenticated' | 'admin'`
- `public` は未ログインで閲覧可、`authenticated` は要ログイン、`admin` は SystemAdmin（Phase 8-A）または Community OWNER/ADMIN
- 未認証ユーザー向けに最小ヘッダー/フッターのレイアウトバリアントを `AppLayout` に追加

### Q7 → ルーティング：3 階層 + slug + OGP
- `/help`（一覧）
- `/help/:categoryId`（カテゴリ）
- `/help/:categoryId/:articleSlug`（記事、OGP/メタ対応）
- 全て公開ルート（`ProtectedRoute` 外）、画面側で audience 判定

## 依存関係
- **Phase 8-A 完了が必須**: 通知基盤・SystemAdmin 判定（admin 記事の表示制御に使用）。
- **Phase 8-B**: `HelpFeedback` / `HelpSubscription` テーブル（Phase 8 と同じ Inquiry 系マイグレーションに同梱）。
- **Phase 9**: ハンバーガーメニューに「ヘルプ」項目を追加（Phase 9 側で実装）。

## 実装前チェックリスト
- [x] カテゴリ一覧確定（4 大カテゴリ × 7 ドメイン）
- [x] ルートパス確定（`/help`, `/help/:categorySlug`, `/help/:categorySlug/:articleSlug`）
- [x] W6-12 への導線位置確定（下部固定 + 末尾 + 記事フィードバック）
- [x] 公開範囲確定（audience メタデータ + `public` デフォルト）
- [x] コンテンツ管理方式確定（MVP は TS レジストリ、Markdown 同梱は Phase 7-2 で完了）
- [x] Vite Markdown ローダ選定 → 自作（`import.meta.glob` + gray-matter + zod）
- [x] HelpFeedback / HelpSubscription の受付 endpoint 設計（MVP: 受信ログ。永続化は backlog 移管）

## 受入条件
- [x] `/help` に未認証でも遷移できる（公開記事のみ閲覧可、admin 記事は非表示）
- [x] カテゴリは初期閉状態で展開でき、検索/最近見た記事 UI が動作する
- [x] 記事ページが slug ベースで OGP/メタ対応される（`react-helmet-async`）
- [x] draft 記事はバッジ + 公開予定 + 通知登録ボタンが表示される
- [x] 問い合わせ導線（下部 CTA / カテゴリ末尾 / 記事フィードバック）から `/contact` にプレフィル付きで遷移できる
- [x] a11y: Radix ベースの標準キーボード操作・ARIA 属性（reduced-motion は Phase 9 側で付与）

## 作業ログ
- 2026-04-25: 現状調査を実施。ヘルプ画面/ルートは未実装を確認。
- 2026-04-27: Q&A 8 項目（Q1-Q7 + 横断方針）を確定。Markdown 同梱 / 2 階層 IA / 検索 + URL fragment / status + notifyMe / 3 系統導線 / audience 別公開 / 3 階層 slug ルーティングを採用。Phase 8 / 9 との同時実装方針を確定。
- 2026-04-27: MVP実装完了。`helpContent.ts`レジストリ（4カテゴリ×記2機能に関するサンプル記事）、`HelpTopPage` / `HelpCategoryPage` / `HelpArticlePage`、audience 判定、検索、最近見た、draft バッジ + notifyMe、記事フィードバック、`/contact` へのプレフィル遷移を完備。Markdown同梱 / Vite loader / Fuse.js / URL fragment / OGP は Phase 7-2 としてバックログ送り（以下追記）。

## 後送り（Phase 7-3 / 後続Wave）
- **HelpFeedback / HelpSubscription の永続化**: 現状の MVP は受信ログのみ（`console.info` + 200 OK）。Prisma スキーマに `HelpFeedback` / `HelpSubscription` テーブルを追加し、ダッシュボードで集計可能にする。Subscription は Phase 8 通知基盤に乗せて公開時に push 配信する。
- **i18n ロケール切替実装**: `contents/ja/` のみ実装済。`contents/en/` 配置 + ロケール切替 UI は将来対応。

## 作業ログ追記
- 2026-04-28: Phase 7-2 残作業を一気貫通で実装完了。
  - **Markdown 同梱**: `frontend/src/features/help/contents/ja/{getting-started,community,troubleshooting,admin}/*.md` を新設。`_category.md` でカテゴリメタも管理。
  - **Vite loader**: `helpLoader.ts` 新設。`import.meta.glob('?raw', eager)` + `gray-matter` + `zod` で frontmatter を起動時検証して型付きレジストリ生成。`helpContent.ts` は後方互換 re-export に縮退。
  - **react-markdown**: `MarkdownRenderer.tsx` 新設。`remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + Tailwind typography 風スタイル。
  - **Fuse.js**: `lib/searchClient.ts` 新設。title weight 3 / tags 2 / summary 1 / body 0.5、threshold 0.4、ignoreLocation。HelpTopPage の検索を置換。
  - **URL fragment**: HelpArticlePage で `useEffect(location.hash → scrollIntoView)`。
  - **prev/next ナビ**: 同カテゴリ内 order 順で `getAdjacentArticles()` 提供、記事末尾に表示。
  - **OGP**: `react-helmet-async` 導入、`main.tsx` に `HelmetProvider`。記事ページで title / description / og:* を動的書き換え。
  - **BE endpoint**: `backend/src/api/front/help/{controllers,routes}/`。`POST /v1/help/feedback`（optional auth + rate-limit）、`POST /v1/help/subscribe`（auth 必須）。MVP は zod 検証 + console ログ + 200。永続化（HelpFeedback/HelpSubscription テーブル）は Phase 7-3 / backlog 移管。
  - **UI 改善 3 点**:
    - [1] 「最近見た」を URL 文字列ではなく **記事タイトル + カテゴリ名** 表示に変更（保存形式 `{categorySlug, articleSlug, title}`、旧文字列形式から自動互換）
    - [2] ContactPage のプレフィルタイトルを `slug` ではなく **記事見出し**に変更（`articleTitle` クエリ → helpLoader lookup → slug の優先順）
    - [3] HelpTopPage カテゴリヘッダー外側に **「詳しく」アイコン動線**（lucide `Info`）を新設、アコーディオン内末尾の「カテゴリトップを見る→」リンクは削除
  - **依存追加**: `react-markdown` `remark-gfm` `gray-matter` `rehype-slug` `rehype-autolink-headings` `fuse.js` `react-helmet-async`
  - **検証**: BE/FE 共に `tsc --noEmit` で新規追加分のエラーなし（既存 unused 警告のみ）
