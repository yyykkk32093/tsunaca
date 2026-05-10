# LIFF（LINE Mini App）統合 — 案件概要

> **作成日**: 2026-03-06
> **ステータス**: 🔲 未着手
> **ゴール**: LIFF 内での全機能動作確認（Web 版と同等の機能を LINE アプリ内 WebView で完全動作させる）
> **前提条件**: frontend-reform（Web 版）の全機能完了
> **優先度**: 🥇 最優先（ネイティブアプリよりも先行）

---

## 案件スコープ

LINE Front-end Framework（LIFF）を導入し、LINE アプリ内 WebView で Tsunaca の全機能を動作させる。
LIFF Browser 固有の制約（Cookie クロスサイト問題）に対応し、既存の Ports/Adapters アーキテクチャを活用して認証・ストレージを切り替える。

---

## 主要タスク（概要）

### 1. LIFF SDK 導入 + 初期化

- `@line/liff` パッケージ導入
- `liff.init({ liffId })` の実装
- LIFF アプリ登録（LINE Developers Console）
- 環境変数管理（LIFF ID）

### 2. 認証フロー実装

- `LiffAuthTokenAdapter` 実装（`IAuthTokenPort` の LIFF 用アダプター）
  - `liff.getAccessToken()` で LINE アクセストークン取得
  - BE に送信 → LINE Login API で検証 → 自前 JWT 発行
- プラットフォーム検出の変更: `Capacitor.isNativePlatform()` → `liff.isInClient()` 分岐
- BE: LINE Login 検証 → ユーザー紐付け/新規作成 API

### 3. LINE Login ↔ パスワード認証のアカウント連携

- 既存パスワード認証ユーザーと LINE アカウントの紐付け API（BE）
- 初回 LIFF アクセス時のアカウント連携/新規登録フロー（FE）

### 4. LIFF Browser 全画面動作検証

- Cookie 非送信環境での Bearer フォールバック動作確認
- 全画面・全機能の LIFF Browser 内動作テスト
- デバッグ・修正

### 5. LINE 共有機能

- `liff.shareTargetPicker()` による招待・アナウンス共有
- 既存 `navigator.share` との抽象化・切り替え

---

## 技術的前提（実装済み基盤）

| 基盤                                                  | 状態       | 詳細                                                         |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| BE 認証ミドルウェア（Cookie → Bearer フォールバック） | ✅ 実装済み | `req.cookies.token` → `req.headers.authorization` の順で検証 |
| BE ログインレスポンスにトークン返却                   | ✅ 実装済み | Cookie 設定 + レスポンスボディに `accessToken` 返却          |
| `IAuthTokenPort` インターフェース                     | ✅ 設計済み | Ports/Adapters パターンで抽象化済み                          |
| `WebAuthTokenAdapter`                                 | ✅ 実装済み | Cookie 方式                                                  |
| `CapAuthTokenAdapter`                                 | ✅ 実装済み | Capacitor 用（Bearer 方式の参考実装として流用可）            |

---

## 技術メモ

- **LIFF Browser の Cookie 制約**: LIFF Browser 内では WebView がクロスサイト扱いになり、`SameSite=Lax` だと Cookie が送信されない → Bearer ヘッダー方式で回避（`frontend/auth-token-strategy.md` 参照）
- **アダプター流用**: 既存 `CapAuthTokenAdapter` の Bearer ヘッダー送信ロジックを `LiffAuthTokenAdapter` で流用可能。トークン取得元のみ変更（`@capacitor/preferences` → `liff.getAccessToken()`）
- **LINE Developers Console**: LIFF アプリの登録・LIFF ID 取得が必要。エンドポイント URL は Web 版と同一
- **LINE Login API**: `https://api.line.me/oauth2/v2.1/verify` でアクセストークン検証。プロフィール取得は `https://api.line.me/v2/profile`

---

## 依存関係

```
frontend-reform（Web版）全機能完了
  └── LIFF 統合
       ├── LIFF SDK 初期化
       ├── LiffAuthTokenAdapter 実装
       ├── LINE Login 検証 API（BE）
       ├── アカウント連携 API（BE）
       ├── 全画面動作検証
       └── LINE 共有機能
```

---

## 広告機能（W5-01）との連携時の注意点

LIFF Browser 内で広告を表示する場合、以下の制約・注意が必要。

### LIFF Browser と AdSense の制約

| 項目                          | 内容                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **WebView 内の AdSense 利用** | Google AdSense はアプリ内 WebView での利用に制約がある。LIFF Browser は LINE アプリ内の WebView であり、通常のブラウザとは異なる扱いを受ける                       |
| **クロスサイト Cookie**       | LIFF Browser はクロスサイト扱いとなり、`SameSite=Lax` Cookie が送信されない。広告トラッキング用の Cookie も影響を受ける可能性がある                                |
| **AdSense ポリシー準拠**      | WebView 内での AdSense コード配置は、Google の「アプリのウェブコンテンツ表示フレームの技術要件」に準拠する必要がある。準拠しない場合はアカウント停止のリスクがある |

### 推奨対応方針

1. **LIFF 内では広告を非表示にする**（最も安全）
   - `liff.isInClient()` で LIFF 環境を検出し、広告コンポーネントをレンダリングしない
   - 広告の Ad Slot Registry（`adConfig.ts`）とは別に、プラットフォーム判定で一括制御
2. **外部ブラウザでは通常通り広告を表示**
   - LIFF から `liff.openWindow()` で外部ブラウザに遷移した場合は通常のブラウザ扱い → AdSense が正常動作
3. **将来のネイティブ化時に AdMob で正式対応**
   - ネイティブアプリ化時に Google AdMob + WebView API for Ads を導入
   - WebView 内コンテンツと AdMob を連携させる公式手段が提供されている

### 実装上の考慮事項

```typescript
// プラットフォーム判定を広告の表示制御に組み込む
// frontend/src/features/ads/useAd.ts

const isLiffClient = liff.isInClient(); // LIFF Browser 内かどうか

const shouldShowAd = isFreeUser && !isLiffClient;
```

- **Cookie Consent**: LIFF 内で広告非表示にするなら、LIFF 内では Cookie Consent バナーも不要
- **収益影響**: LIFF 経由のアクセスが多い場合、広告収益に影響する。外部ブラウザへの誘導を検討する余地あり
- **参照**: 広告アーキテクチャの詳細は `projects/01_design/02_frontend/ads-architecture.md` を参照

---

## 作業ログ

- 2026-03-06: 案件作成。Capacitor 撤廃に伴い、LIFF 統合を独立案件として切り出し。最優先案件として位置づけ
- 2026-04-12: 広告機能（W5-01）との連携時の注意点を追記。LIFF Browser 内での AdSense 制約と推奨対応方針を記載
