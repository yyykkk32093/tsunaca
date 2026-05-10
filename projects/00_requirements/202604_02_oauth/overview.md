# 🔐 OAuth 連携 — 案件概要

> **作成日**: 2026-03-06
> **ステータス**: 🚧 一部実装済み・残タスクあり
> **スコープ**: OAuth 認証（サインイン/サインアップ）全般 + 将来の OAuth 連携機能

---

## ゴール

OAuth 関連の実装・課題を一元管理する。認証フロー（Google / LINE / Apple）の完成度を把握し、未実装部分やアカウント連携、将来の OAuth 連携（Google Calendar API 等）を計画的に進める。

---

## 現状サマリ

### ✅ 実装済み（フルスタック完了）

| レイヤー             | 状態 | 詳細                                                                                       |
| -------------------- | ---- | ------------------------------------------------------------------------------------------ |
| DB スキーマ          | ✅    | `GoogleCredential` / `LineCredential` / `AppleCredential` 3テーブル                        |
| ドメイン層           | ✅    | リポジトリ I/F + Prisma 実装（各プロバイダー）                                             |
| インテグレーション層 | ✅    | Google OAuth2 / LINE Login / Apple Sign In の Authorization Code Flow                      |
| UseCase              | ✅    | `OAuthLoginUseCase` — 自動 signup + ログイン + email 重複検知 + 監査イベント               |
| API                  | ✅    | `POST /v1/auth/oauth` — httpOnly Cookie + レスポンスボディ両対応                           |
| フロントエンド       | ✅    | ログイン/サインアップ画面に 3 プロバイダーボタン + `/auth/oauth/callback` コールバック処理 |
| Secrets 管理         | ✅    | `secrets.ts` で環境変数から clientId / clientSecret 読み込み                               |
| E2E テスト           | ✅    | FakeProviderClient + テスト実装済み                                                        |

### ⚠️ 未実装・課題

| #   | タスク                         | 説明                                                                                                                                                                                     | 優先度 |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **アカウント連携 API**         | 既存パスワードユーザーに OAuth アカウントを紐付ける API が未提供。`OAuthLoginUseCase` は email 重複時に `EmailAlreadyExistsError` (409) をスローするのみで、リンク用エンドポイントがない | 🔴 高   |
| 2   | **アカウント連携 UI**          | マイページ等から「Google アカウントを連携」「LINE を連携」する UI が未実装                                                                                                               | 🔴 高   |
| 3   | **OAuth 認証フローの動作検証** | 各プロバイダーの実環境での E2E 検証が未完了の可能性あり（Fake テストのみ確認済み）                                                                                                       | 🟡 中   |
| 4   | **Google Calendar OAuth 連携** | UBL-22 の将来拡張。URL スキーム + iCal で初期リリース後、利用状況次第で OAuth 連携（一括登録）を検討                                                                                     | 🟢 低   |

---

## 技術構成

### 関連ファイル（バックエンド）

| レイヤー               | パス                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| API ルート             | `backend/src/api/front/auth/routes/oauthRoutes.ts`                                                  |
| API コントローラー     | `backend/src/api/front/auth/controllers/oauthController.ts`                                         |
| UseCase                | `backend/src/application/auth/usecase/OAuthLoginUseCase.ts`                                         |
| ドメインリポジトリ I/F | `backend/src/domains/user/domain/repository/I{Google,Line,Apple}CredentialRepository.ts`            |
| リポジトリ実装         | `backend/src/domains/user/infrastructure/repository/{Google,Line,Apple}CredentialRepositoryImpl.ts` |
| IdP クライアント       | `backend/src/integration/idp/{google,line,apple}Client.ts`                                          |
| Secrets                | `backend/src/_bootstrap/secrets.ts`                                                                 |
| E2E テスト             | `backend/test/e2e/auth/oauthLogin.test.ts`                                                          |

### 関連ファイル（フロントエンド）

| レイヤー         | パス                                                     |
| ---------------- | -------------------------------------------------------- |
| OAuth ボタン UI  | `frontend/src/features/auth/components/OAuthButtons.tsx` |
| OAuth ヘルパー   | `frontend/src/features/auth/lib/oauthHelpers.ts`         |
| コールバック処理 | `frontend/src/features/auth/pages/OAuthCallbackPage.tsx` |
| API クライアント | `frontend/src/features/auth/api/authApi.ts`              |

---

## タスク計画

### Phase 1: アカウント連携（優先）

1. BE: `LinkOAuthAccountUseCase` 新設 — 認証済みユーザーに OAuth credential を紐付け
2. BE: `POST /v1/users/me/linked-accounts/:provider` エンドポイント追加
3. BE: `DELETE /v1/users/me/linked-accounts/:provider` （連携解除）
4. FE: マイページに「アカウント連携」セクション追加（連携済みプロバイダー表示 + 連携/解除ボタン）

### Phase 2: Google Calendar OAuth 連携（将来）

- Google Cloud Console で Calendar API 有効化 + OAuth スコープ追加
- BE: Google Calendar API クライアント実装（トークン管理含む）
- FE: 「Google Calendar と同期」ボタン → OAuth 認可フロー → 一括イベント登録

---

## 作業ログ

- 2026-03-06: 案件作成。既存 OAuth 実装の棚卸しを実施。アカウント連携 API が主要な未実装タスクと判明
