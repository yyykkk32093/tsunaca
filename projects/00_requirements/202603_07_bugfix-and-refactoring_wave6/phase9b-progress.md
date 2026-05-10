# Phase 9b — ヘルプ周り残開発（HelpFeedback 永続化 / オペレーター強化 / i18n / IA / a11y）

> **最終更新**: 2026-05-10
> **ステータス**: ✅ Phase 9b 主要タスク完了 / Group F（9b-07 コンテンツ拡充）は保留
> **前提**: Phase 7 / 7-2（ヘルプ画面 MVP + Markdown 同梱 + Fuse.js + OGP + BE endpoint MVP）+ Phase 8 通知基盤完了済
> **テスト観点**: TBD（デプロイ後に `projects/02_tests/wave6/phase9b-tests.md` を作成）

## フェーズ概要
- **ゴール**: Phase 7 / 7-2 で「画面と受信窓口」までを構築したヘルプ機能を「運営が改善できる資産」に変える。draft 公開運用は代わりに **HelpFeedback 永続化 + 集計ダッシュボード** に全面シフトし、併せて **問い合わせの運営返信 Push + 担当者割当** と **ヘルプ UX 改善 / IA + i18n / a11y** を一括実装。
- **対象**: W6-11 のフォローアップ（Wave6 完了後の改善 Wave）
- **スコープ確定（2026-05-10）**:
  - **削除**: 9b-02（HelpSubscription 永続化） / 9b-03（公開時 push 通知） / notifyMe UI / draft → published 運用
  - **追加**: 9b-14 メニュー文言修正 / 9b-15 運営返信 Push / 9b-16 担当者割当 / 9b-17 撤去

---

## タスク一覧（目的別）

| #         | タスク                                                                | 目的カテゴリ             | 状態   | 備考                                                                                                 |
| --------- | --------------------------------------------------------------------- | ------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| 9b-01     | `HelpFeedback` テーブル拡張 + 永続化（upsert）                        | 🎯 業務（運営KPI）        | ✅ 完了 | controller を console.info → Prisma upsert/create に差し替え、unique [userId, articleSlug]           |
| 9b-04     | 運営ダッシュボードに記事フィードバック集計画面を追加                  | 🎯 業務（運営KPI）        | ✅ 完了 | `/admin/help-feedback` テーブル + helpful率昇順ソート + CSVエクスポート                              |
| 9b-05     | i18n: `contents/en/` 配置 + ロケール切替                              | 🌐 UX（多言語）           | ✅ 完了 | helpLoader locale引数化 / User.locale追加 / LocaleProvider / HamburgerMenu切替                       |
| 9b-06     | サブカテゴリ（ドメイン軸）IA の本実装                                 | 🧭 UX（情報設計）         | ✅ 完了 | frontmatter `domain` (community/activity/payment/account/others) + カテゴリグルーピング + 検索バッジ |
| 9b-07     | コンテンツ拡充（主要ユーザー導線をカバー）                            | 📚 業務（記事資産）       | 🔜 保留 | ライティング作業。Phase 9b デプロイ後にフィードバック集計を見ながら逐次追加                          |
| 9b-08     | 検索ハイライト（Fuse の matches を装飾）                              | 🌐 UX（検索体験）         | ✅ 完了 | searchClient `includeMatches: true` + highlight.tsx                                                  |
| 9b-09     | 記事内目次（TOC）右カラム                                             | 🌐 UX（読了支援）         | ✅ 完了 | toc.ts (h2/h3 + GitHub-slug) + sticky サイドバー                                                     |
| 9b-10     | 関連記事リコメンド（同タグ・同カテゴリ）                              | 🌐 UX（回遊）             | ✅ 完了 | relatedArticles.ts スコア = tags*2 + sameCategory*1                                                  |
| 9b-11     | 記事 last-updated 表示                                                | 🌐 UX（信頼性）           | ✅ 完了 | frontmatter `updatedAt` + ヘッダー表示                                                               |
| 9b-12     | カテゴリ「詳しく」アイコン動線の再検討                                | ♻️ リファクタ（UI整理）   | ✅ 完了 | Infoアイコンを撤去し「{label}の記事をすべて見る →」をアコーディオン末尾に配置                        |
| 9b-13     | a11y 強化（スキップリンク・フォーカスリング・motion）                 | 🌐 UX（アクセシビリティ） | ✅ 完了 | skip-link + global :focus-visible + prefers-reduced-motion CSS                                       |
| 9b-14     | **NEW** ヘッダーメニュー「【マイ】問い合わせ履歴」→「問い合わせ履歴」 | ♻️ リファクタ（UI整理）   | ✅ 完了 | HamburgerMenu L63 修正                                                                               |
| 9b-15     | **NEW** 運営返信時の Push 通知                                        | 🎯 業務（運営チームUX）   | ✅ 完了 | inquiryNotificationService で OutboxEvent (notification.push) emit                                   |
| 9b-16     | **NEW** 担当者割当（Inquiry.assigneeUserId）                          | 🎯 業務（運営チーム連携） | ✅ 完了 | PATCH /v1/admin/inquiries/:id/assignee + 担当フィルタ + プルダウン                                   |
| 9b-17     | **NEW** HelpSubscription / notifyMe UI / status 撤去                  | 🧹 クリーンアップ         | ✅ 完了 | controller / route / migration / frontmatter / FE バッジ 全剖除                                      |
| ~~9b-02~~ | ~~HelpSubscription 永続化~~                                           | —                        | ❌ 廃止 | 9b-17 に吸収                                                                                         |
| ~~9b-03~~ | ~~公開時 push 通知~~                                                  | —                        | ❌ 廃止 | draft 運用不因でスコープ外                                                                           |

### 目的カテゴリの凡例
| マーク             | 意味                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| 🎯 業務             | 運営/ユーザー双方の業務フローを成立させる新機能。KPI・通知配信に直結 |
| 🌐 UX               | ユーザーの体験品質向上                                               |
| 🧭 UX（情報設計）   | 情報の見つけやすさ・構造改善                                         |
| 📚 業務（記事資産） | コンテンツ自体を増やし、ヘルプの目的を達成                           |
| ♻️ リファクタ       | 既存UIの整理・命名・配置の見直し                                     |
| 🧹 クリーンアップ   | 不要になったコード・テーブルを安全に削除                             |

---

## タスク一覧（目的別）

| #     | タスク                                                 | 目的カテゴリ             | 状態     | 備考                                                                       |
| ----- | ------------------------------------------------------ | ------------------------ | -------- | -------------------------------------------------------------------------- |
| 9b-01 | `HelpFeedback` テーブル新設 + 永続化                   | 🎯 業務（運営KPI）        | ❌ 未着手 | controller を console.info → Prisma insert に置換、運営集計の起点          |
| 9b-02 | `HelpSubscription` テーブル新設 + upsert 永続化        | 🎯 業務（公開通知）       | ❌ 未着手 | userId × categorySlug × articleSlug の一意化、`notifiedAt?` で配信状況管理 |
| 9b-03 | 公開時 push 通知（draft → published 遷移を Outbox で） | 🎯 業務（UX×通知）        | ❌ 未着手 | Phase 8 通知基盤に乗せ、`HelpSubscription` 購読者にアプリ内通知            |
| 9b-04 | 運営ダッシュボードに記事フィードバック集計画面を追加   | 🎯 業務（運営KPI）        | ❌ 未着手 | 記事ごとの 👍/👎 比率・購読者数・低評価アラート                              |
| 9b-05 | i18n: `contents/en/` 配置 + ロケール切替               | 🌐 UX（多言語）           | ❌ 未着手 | `helpLoader.ts` を locale 引数化、ヘッダー or 設定でロケール選択           |
| 9b-06 | サブカテゴリ（ドメイン軸）IA の本実装                  | 🧭 UX（情報設計）         | ❌ 未着手 | 記事 frontmatter に `domain`、カテゴリページでドメイン別グルーピング表示   |
| 9b-07 | コンテンツ拡充（主要ユーザー導線をカバー）             | 📚 業務（記事資産）       | ❌ 未着手 | コミュニティ運営 / アクティビティ / 支払い / 退会 等のサンプル → 本記事化  |
| 9b-08 | 検索ハイライト（Fuse の matches を装飾）               | 🌐 UX（検索体験）         | ❌ 未着手 | 検索結果のタイトル / 概要にマーク、再入力数を減らす                        |
| 9b-09 | 記事内目次（TOC）右カラム                              | 🌐 UX（読了支援）         | ❌ 未着手 | rehype-slug で ID 既付与済 → 見出し抽出して sticky TOC                     |
| 9b-10 | 関連記事リコメンド（同タグ・同カテゴリ）               | 🌐 UX（回遊）             | ❌ 未着手 | 記事末尾に最大 3 件、prev/next とは別枠                                    |
| 9b-11 | 記事 last-updated 表示                                 | 🌐 UX（信頼性）           | ❌ 未着手 | frontmatter に `updatedAt` 追加、記事ヘッダーに表示                        |
| 9b-12 | カテゴリ「詳しく」アイコン動線の再検討                 | ♻️ リファクタ（UI整理）   | ❌ 未着手 | 現状 `Info` アイコン。意図がわかるラベル/位置に再設計                      |
| 9b-13 | a11y 強化（スキップリンク・フォーカスリング・motion）  | 🌐 UX（アクセシビリティ） | ❌ 未着手 | Phase 9 共通施策と連動、reduced-motion 対応                                |

### 目的カテゴリの凡例
| マーク             | 意味                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| 🎯 業務             | 運営/ユーザー双方の業務フローを成立させる新機能。KPI・通知配信に直結   |
| 🌐 UX               | ユーザーの体験品質向上（既存業務は成立しているが、満足度・効率が改善） |
| 🧭 UX（情報設計）   | 情報の見つけやすさ・構造改善                                           |
| 📚 業務（記事資産） | コンテンツ自体を増やし、ヘルプの目的（自己解決率向上）を達成           |
| ♻️ リファクタ       | 既存UIの整理・命名・配置の見直し                                       |

---

## 各タスクの詳細目的・成功条件

### 9b-01 / 9b-02 / 9b-04: HelpFeedback / HelpSubscription 永続化と集計画面
- **解決したい業務課題**: 現状はフィードバックボタンを押しても `console.info` ログが出るだけで、運営は記事改善判断の材料を得られない。
- **目的**: 「悪い評価が多い記事」を可視化し、ヘルプ → 問い合わせ件数を減らす **記事改善の PDCA を回せる状態** にする。
- **成功条件**:
  - 👍/👎 が DB に記録され、運営ダッシュボードで記事ごとの helpful 率が見られる
  - 低評価率が一定以上の記事は運営トップにアラート表示
  - 購読者数が記事メタとして見え、「需要があるが draft」を運営が把握できる

### 9b-03: 公開時 push 通知
- **解決したい業務課題**: draft 記事に notifyMe 登録をもらっても、公開時に通知できないため約束を果たせていない（信用毀損リスク）。
- **目的**: 「公開時に通知を受け取る」というユーザーへの約束を履行する。
- **成功条件**:
  - draft → published に遷移した瞬間 Outbox にイベント発火、購読者にアプリ内通知が届く
  - `notifiedAt` で二重配信を防止
  - 通知タップで該当記事に遷移

### 9b-05: i18n（en）
- **解決したい業務課題**: 海外/英語ユーザーがヘルプを読めない。
- **目的**: 多言語化の足回り完成。LIFF/ネイティブ案件と合わせて海外展開の前提を整える。
- **成功条件**:
  - `contents/en/` 配置で英語記事が表示できる
  - ユーザーのロケール設定 or ブラウザ言語で自動切替、明示切替 UI も提供
  - 記事メタ（title/summary/tags）も locale ごとに別管理

### 9b-06: サブカテゴリ（ドメイン軸）IA
- **解決したい業務課題**: 大カテゴリのみ（4 件）では記事増加時にスクロール疲労が発生し、目的の記事に辿り着けない。
- **目的**: Q2 で確定済みの「2 階層 IA（大カテゴリ × ドメイン）」の本実装。情報の見つけやすさを担保。
- **成功条件**:
  - 記事 frontmatter に `domain` が付与され zod 検証
  - カテゴリページでドメイン別にグルーピング表示
  - 検索結果にもドメインバッジが出る

### 9b-07: コンテンツ拡充
- **解決したい業務課題**: 現在は各カテゴリに 1〜2 記事のサンプルしかなく、ヘルプの目的（自己解決）を実現できていない。
- **目的**: 自己解決率を上げ、問い合わせ件数を削減する。
- **成功条件**:
  - 主要シナリオ（コミュニティ運営 / アクティビティ作成 / 支払い / 退会 / トラブルシュート）で各 5 記事以上
  - 9b-01 の集計と連動して低評価/未存在テーマを継続追加

### 9b-08 / 9b-09 / 9b-10 / 9b-11: 検索体験・読了支援・回遊・信頼性
- **解決したい業務課題**: 記事に到達できても本文が長く離脱しがち / 関連情報が見つけにくい / 古さがわからず信頼できない。
- **目的**: 単発の **UX 改善積み増し**。記事数増加に備えて検索/目次/回遊/メタ表示を強化。
- **成功条件**:
  - 検索結果でヒット箇所がハイライトされる
  - 長い記事に sticky TOC が出て見出しジャンプ可能
  - 記事末尾に関連 3 件（同タグ ∩ 同カテゴリの優先順）
  - 記事ヘッダーに「最終更新: YYYY-MM-DD」表示

### 9b-12: 「詳しく」アイコン動線の再検討
- **解決したい業務課題**: Phase 7-2 で追加した `Info` アイコンが「詳しく」を意味するのか直感的でなく、注意ポイントを分散させる懸念（Phase 7-2 ユーザーレビュー指摘）。
- **目的**: ヘルプトップの一覧体験のシンプル化。
- **成功条件**:
  - アイコン or ラベルが「カテゴリ全記事へ」と一目で分かる
  - 記事タイトルリンク（最近見た）と動線競合せず、注意ポイントが分散しない

### 9b-13: a11y 強化
- **解決したい業務課題**: スクリーンリーダー / キーボード単独 / motion 嫌悪設定ユーザー対応が、Phase 9 共通施策依存で未完。
- **目的**: アクセシビリティ基準を一段階引き上げ。
- **成功条件**:
  - スキップリンクで本文に直接ジャンプできる
  - `prefers-reduced-motion` で transitions/animation を抑制
  - フォーカスリング統一

---

## 依存関係
- **9b-01 / 02 / 04** → 互いに依存（テーブル → API 永続化 → 集計画面）。同一マイグレーションでテーブル発行推奨。
- **9b-03** → 9b-02 完了が前提。Phase 8 の通知基盤（Notification + Outbox）が完了済であることを利用。
- **9b-05** → 既存 `helpLoader.ts` の locale 引数化を伴うが、ja の互換性を壊さないこと。
- **9b-06** → frontmatter スキーマ変更を伴うため 9b-05 と同時実装で migration コスト削減。
- **9b-07** → 9b-01 が稼働してからのほうが「どの記事から書くか」を集計判断できる。

## 推奨実装順
1. **9b-01 / 9b-02 / 9b-04**（業務 KPI 起点。ここを最優先で完了させ Phase 7 の "閉ループ" を成立させる）
2. **9b-03**（約束履行）
3. **9b-12 / 9b-13**（軽量 UI 整理、リスクが小さく即効性あり）
4. **9b-06 + 9b-05**（IA + i18n をスキーマ変更まとめて）
5. **9b-08 / 9b-09 / 9b-10 / 9b-11**（UX 積み増し）
6. **9b-07**（並行で常時拡充）

---

## 実装前チェックリスト
- [ ] `HelpFeedback` / `HelpSubscription` のスキーマ確定（カラム・index・FK）
- [ ] 公開時通知の Outbox イベント名・ペイロード確定（`HelpArticlePublished`）
- [ ] 集計ダッシュボードのワイヤー作成
- [ ] i18n 切替の保持先（user設定 / localStorage / URL）の方針確定
- [ ] frontmatter `domain` の Enum リスト確定（Q2 既定の 7 ドメインで確定可）
- [ ] 「詳しく」動線リデザインのモック確認

## 受入条件
- [ ] 👍/👎 が DB に記録され、運営ダッシュボードで helpful 率が見られる
- [ ] draft → published への遷移で `HelpSubscription` 購読者に通知が届く（`notifiedAt` で重複配信なし）
- [ ] ロケール切替で英語ヘルプが表示される（ja は既存挙動を維持）
- [ ] 記事 frontmatter の `domain` が zod 検証され、カテゴリページでドメイン別表示される
- [ ] 記事末尾に関連記事 3 件が表示される
- [ ] 記事ヘッダーに最終更新日が表示される
- [ ] 「詳しく」動線が注意ポイントを分散させないデザインに更新される
- [ ] a11y: skip-link / reduced-motion / focus-ring が全ヘルプ画面で機能する

## 作業ログ
- 2026-05-03: Phase 9b として起票。Phase 7 / 7-2 の後送り欄 + 7-2 セッションで挙がった改善候補を、目的別（業務 / UX / IA / リファクタ / 記事資産）に分類して 13 タスク化。- 2026-05-10: 要件すり合わせ。A-1 / B-1 / C-1 / D-3+D-4 / E-1 を確定。**HelpSubscription 計画を全面撤去し 9b-17 に一本化**、代わりに 9b-14（メニュー文言）/ 9b-15（運営返信Push）/ 9b-16（担当者割当）を追加。追加決定: frontmatter status 撤去 / rate-limit 既存流用 / i18n は User.locale + localStorage + navigator.language フォールバック / ドメイン 5 種 (community/activity/payment/account/others)。
- 2026-05-10: 実装進掣。
  - **Group 0**（9b-17）完了。schema.prisma から HelpSubscription モデル、controller.subscribe / `/v1/help/subscribe` ルート、frontmatter `status` / `expectedReleaseAt`、HelpArticlePage の notifyMe UI を全剖除。migration `20260510120000_wave6_phase9b_help_feedback_persist` で DROP TABLE 及び HelpFeedback 拡張 (categorySlug, updatedAt, unique [userId, articleSlug])。
  - **Group A**（9b-01 + 9b-04）完了。helpController.submitFeedback を Prisma upsert/create に差し替え、匿名許容、認証ユーザーは userId×articleSlug で上書き。`/admin/help-feedback` ダッシュボード（AdminHelpFeedbackPage）追加、groupBy + helpful率ソートテーブル + CSV エクスポート。HamburgerMenu に「ヘルプフィードバック集計」リンク追加。
  - **Group B**（9b-12 + 9b-14）完了。ヘルプトップの Info アイコンを撤去し「{label}の記事をすべて見る →」をアコーディオン展開末尾に配置。HamburgerMenu の「マイ問い合わせ履歴」→「問い合わせ履歴」に修正。
  - **Group D**（9b-08/09/10/11/13）完了。検索ハイライト (highlight.tsx + Fuse includeMatches)、sticky TOC (toc.ts)、関連記事 (relatedArticles.ts)、last-updated、skip-link + :focus-visible 統一 + prefers-reduced-motion グローバル CSS。
  - **Group C**（9b-15 + 9b-16）完了。inquiryNotificationService に OutboxEvent emit を追加し PushNotificationIntegrationHandler 経由で FCM 配信。Inquiry に assigneeUserId 追加、PATCH /v1/admin/inquiries/:id/assignee と GET /v1/admin/system-admins 追加、AdminInquiriesPage に担当フィルタ+バッジ、AdminInquiryDetailPage に担当者プルダウン。migration `20260510130000_wave6_phase9b_inquiry_assignee` 適用。
  - **Group E**（9b-05 + 9b-06）完了。User.locale 追加マイグレーション (`20260510140000_wave6_phase9b_user_locale`)、GET/PATCH /v1/users/me/locale、LocaleProvider (resolveActiveLocale: User.locale > localStorage > navigator.language > 'ja')、helpLoader / searchClient / relatedArticles を locale 引数化、`contents/en/getting-started/` にサンプル 2 記事、HamburgerMenu にロケール切替 UI、HelpCategoryPage でドメイン別グルーピング、HelpTopPage 検索結果にドメインバッジ。
  - BE/FE tsc クリーン、全 migration 適用済み。
  - **保留**: 9b-07（コンテンツ拡充）はライティング作業、デプロイ後に 9b-04 ダッシュボードの集計を見ながら逐次追加。