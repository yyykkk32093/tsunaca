# Phase 4 — 広告機能（W5-01）

> **最終更新**: 2026-04-15
> **ステータス**: ✅ Phase 4 完了

## フェーズ概要
- **ゴール**: FREE プラン向け広告表示機能の実装（モックモードで全機能開発 → 審査通過後に本番切替）
- **対象**: W5-01
- **変更対象レイヤー**: UI（フロントエンドのみ。バックエンド変更不要）
- **規模**: XL（1タスクだが、15配置箇所 + Cookie Consent + 基盤コンポーネント）

## タスク一覧

| タスク                             | 状態   | 備考                                                     |
| ---------------------------------- | ------ | -------------------------------------------------------- |
| W5-01 広告機能（有料プラン非表示） | ✅ 完了 | XL。全15箇所配置・Cookie Consent・基盤コンポーネント完了 |

## タスク詳細リンク

- [W5-01 広告機能 — 要件定義](W5-01-ads.md)
- [広告フロントエンド設計](../../01_design/02_frontend/ads-architecture.md)
- [AdSense 導入手順（cloudservice-setting.md §6）](../../01_design/cloudservice-setting.md)

## 実装順序

```
基盤構築 → 配置実装 → Cookie Consent → テスト
  │              │            │
  ├─ adConfig.ts ├─ 15箇所に  ├─ CookieConsent.tsx
  │  （Ad Slot    │  AdBanner/  │  Google Consent Mode v2
  │   Registry）  │  AdFeedItem ├─ プライバシーポリシー更新
  ├─ useAd.ts    │  を配置     │
  │  （プラン     │             └─ LIFF 環境での非表示制御
  │   判定hook）  │
  ├─ AdBanner.tsx│
  │  （モック/    │
  │   本番切替）  │
  └─ useAdFeed.ts│
     （フィード   │
      挿入hook）  │
```

## 備考
- **VITE_AD_MODE=mock** でアカウント不要でフル開発可能。審査通過後に `.env` 変更のみ
- AdSense 審査は本番公開後に別途実施（開発と独立）
- W5-28（プラン改革）への依存なし（FREE 判定のみで動作）

## 作業ログ
- 2026-04-14: Phase 4 progress 作成
- 2026-04-15: W5-01 広告機能 実装完了
  - Phase A: 基盤構築（types.ts, adConfig.ts, useAd.ts, useAdFeed.ts, useInView.ts, adScriptLoader.ts, consentStore.ts, AdBanner.tsx, AdFeedItem.tsx, AdSkeleton.tsx）
  - Phase B: Cookie Consent（Consent Mode v2 + CookieConsent.tsx + AppLayout統合）
  - Phase C: 15画面への広告配置（固定10箇所 + フィード5箇所）+ ActivitiesTab（コミュニティ詳細）
  - Phase D: TypeScript コンパイルチェック通過（エラー0件）
  - FeedList.tsx の hooks 違反修正（useAdFeed をトップレベルに移動）
