# iOS ネイティブアプリ（Swift/SwiftUI） — 案件概要

> **作成日**: 2026-03-06
> **ステータス**: 🔲 未着手
> **ゴール**: Swift/SwiftUI で iOS ネイティブアプリを構築し、App Store で公開
> **前提条件**: frontend-reform（Web 版）全機能完了 + LIFF 統合完了推奨
> **優先度**: 🥈 2番目（LIFF 統合の次）

---

## 案件スコープ

Capacitor（ハイブリッド）ではなく、Swift/SwiftUI によるフルネイティブ iOS アプリを新規構築する。
バックエンドは Web 版・LIFF 版と共通の REST API を利用し、ネイティブ固有の機能（Apple Pay、プッシュ通知、IAP）を統合する。

---

## 主要タスク（概要）

> ※ 旧 frontend-reform Backlog Phase 5 の UBL-24〜27 から移管 + ネイティブ固有タスクを追加

### 1. iOS プロジェクト初期化

- Xcode プロジェクト作成（Swift/SwiftUI）
- プロジェクト構成（MVVM or Clean Architecture）
- API 通信層の設計（`URLSession` + Bearer トークン管理）

### 2. ネイティブ認証フロー

- LINE Login SDK for iOS 統合
- パスワード認証（既存 BE API 呼び出し）
- Keychain によるトークン管理

### 3. 画面実装

- Web 版と同等の全画面をネイティブ UI で構築
- SwiftUI コンポーネント設計

### 4. Stripe iOS SDK + PaymentSheet 統合（旧 UBL-24）

- Stripe iOS SDK 導入（`stripe-ios`）
- PaymentSheet による決済フロー
- Apple Pay 対応
- BE の `IStripeService` / `StripeServiceImpl` を共通基盤として利用（PaymentIntent 作成・Webhook 検証・返金処理は BE 共通）

### 5. RevenueCat Swift SDK 統合（旧 UBL-25）

- `RevenueCat` ネイティブ SDK 導入
- App Store サブスクリプション管理
- Paywall 画面のネイティブ実装

### 6. APNs + FCM プッシュ通知（旧 UBL-26）

- APNs 証明書/キー設定
- Firebase Cloud Messaging iOS SDK 導入
- デバイストークン登録 API 連携（BE の UBL-14 プッシュ通知基盤を利用）

### 7. App Store 申請（旧 UBL-27）

- App Icons / Launch Screen 作成
- App Store Connect メタデータ・スクリーンショット
- Xcode Archive → App Store Connect 申請
- App Review 対応

---

## 技術メモ

- **BE 共通基盤**: REST API は Web/LIFF/iOS 共通。認証は Bearer ヘッダー方式（Cookie 不要）
- **IStripeService 保持**: Backlog Phase 1 で Stripe Connect スキャフォールドは削除したが、`IStripeService.ts` / `StripeServiceImpl.ts` は保持。PaymentIntent 作成・Webhook 検証・返金処理はネイティブ/Web 共通で再利用する（2026-03-05 決定）
- **プッシュ通知基盤**: BE 側のデバイストークン管理 API・FCM 配信サービス（frontend-reform Backlog Phase 3: UBL-14）が前提
- **Capacitor 不使用**: ハイブリッドではなくフルネイティブ方針（2026-03-06 決定）

---

## 依存関係

```
frontend-reform（Web版）全機能完了
  └── LIFF 統合完了（推奨）
       └── iOS ネイティブ
            ├── BE REST API（共通）
            ├── BE UBL-14 プッシュ通知基盤（Phase 3）
            ├── BE IStripeService（共通決済基盤）
            └── App Store 申請
```

---

## 作業ログ

- 2026-03-06: 案件作成。Capacitor 撤廃に伴い、Swift ネイティブ iOS アプリを独立案件として切り出し。旧 UBL-24〜27 を移管
