# Phase 2 — コミュニティ導線・設定の改善（W6-01, W6-02, W6-05）

> **最終更新**: 2026-04-25
> **ステータス**: ✅ Phase 2 完了

## フェーズ概要
- **ゴール**: コミュニティ一覧/設定/ツリーの導線を仕様どおりに揃える
- **対象**: W6-01, W6-02, W6-05
- **変更対象レイヤー**: UI / API / Domain / Infrastructure

## タスク一覧

| タスク                                     | 状態   | 備考                                                                         |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| W6-01 サブコミュニティのブックマーク有効化 | ✅ 完了 | `SubCommunityListItem` を CommunityCard 互換に拡張し一覧で常にブックマーク可 |
| W6-02 外部連携タブ削除（クレカ連携以外）   | ✅ 完了 | `CommunitySettingsPage` から `webhook` セクションを物理削除                  |
| W6-05 ツリー画面にサブコミュニティ作成 CTA | ✅ 完了 | OWNER/ADMIN のみ表示、`/communities/:rootId/sub/new` へ遷移                  |

## 実装内容

### W6-01 サブコミュニティのブックマーク有効化
- BE
  - `SubCommunityListItem` 型に `parentId / description / latestAnnouncementTitle / latestAnnouncementAt / bookmarked` を追加。
  - `CommunityRepositoryImpl.findChildrenWithDetails(parentId, viewerUserId)` を拡張し、最新お知らせ + bookmark を JOIN して返却。
  - `ListSubCommunitiesUseCase.execute({ parentId, viewerUserId })` に viewer 情報を追加。
  - `communityController.listChildren` で `req.user?.userId` を渡す。
- FE
  - `SubCommunityListItem` 型を BE に追従。
  - `CommunityCard` のプロップを `CommunityCardItem`（id/name/logoUrl/最新お知らせ/description/bookmarked のみ）に縮小し、
    `CommunityListItem` と `SubCommunityListItem` の双方を受け取れるように。
  - `CommunityListPage` のサブコミュ展開ブランチで、API から取得した子要素を全て `CommunityCard` で表示するよう統一。

### W6-02 外部連携タブ削除
- `CommunitySettingsPage`
  - `Section` 型から `'webhook'` を削除。
  - 「外部連携 (準備中)」セクションヘッダー + 本体を物理削除。
  - Stripe Connect 関連 UI（支払い設定セクション内）はそのまま維持。

### W6-05 ツリー画面にサブコミュニティ作成 CTA
- `SubCommunityTreePage`
  - `useMyRole(rootId)` を追加し OWNER/ADMIN のみボタンを表示。
  - ヘッダー右上に「+ サブコミュニティ作成」ボタンを配置（`/communities/:rootId/sub/new` へ navigate）。
  - 既存の `SubCommunityCarousel` 経由の作成導線も維持（決定どおり両方残す）。

## 確定した設計

- ブックマークの一覧表示位置はフラット表示（親と同じリスト/ツリー内）。
- W6-02 は将来再復活の予定なしのため物理削除。Webhook が必要になった時点で別 Section type として再設計する前提。
- W6-05 ボタンの権限は OWNER/ADMIN のみ表示（MEMBER には非表示）。
- W6-05 の作成先はルートコミュニティ配下（`rootId` 基準）に固定し、深さは現在 1 階層のみ運用。

## 受入条件
- [x] サブコミュニティでもブックマーク仕様が統一される
- [x] 「外部連携」セクションが UI/Section 型から消えている
- [x] ツリー画面からサブコミュニティ作成へ遷移できる（OWNER/ADMIN のみ）
- [x] 既存 Stripe 連携導線は維持される
- [x] 既存のカルーセル経由の作成導線も維持される

## 作業ログ
- 2026-04-25: 現状調査を実施。W6-01/02 は部分的に実装済み、W6-05 は未実装を確認。
- 2026-04-25: 設計確定後に実装。BE 型/Repo/UseCase/Controller を一気通貫で更新、FE は CommunityCard を共通化、`tsc` BE/FE ともにエラー 0 を確認。Phase 2 完了。
