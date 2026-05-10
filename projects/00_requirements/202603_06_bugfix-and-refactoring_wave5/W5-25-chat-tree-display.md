# W5-25 チャット — コミュニティカテゴリのツリー形式表示 + 未読管理

> **最終更新**: 2026-04-19
> **ステータス**: ✅ 完了

## 概要
- **ゴール**: コミュニティカテゴリのチャットをツリー形式で展開表示 + 未読バッジ
- **対象**: フロントエンド（ChatTab）+ バックエンド（API + DB）
- **由来**: wave4 carry-over [11]

---

## 確定済み設計判断

| #   | 論点                     | 決定                                                                         |
| --- | ------------------------ | ---------------------------------------------------------------------------- |
| 1   | ツリーデータ取得         | チャット専用エンドポイント新設（GET /v1/channels/community-tree）            |
| 2   | ツリーUIコンポーネント   | SubCommunityTreePageのパターンをベースに、チャット専用の新コンポーネント作成 |
| 3   | チャットルームの階層表示 | 個別ルームの展開表示（親に子メッセージ統合はしない）                         |
| 4   | データ取得方式           | 全件一括ロード（コミュニティ階層は浅く数も少ないため）                       |
| 5   | 未読バッジ               | 今回実装。親ノードに子の未読数を集約表示                                     |
| 6   | 既読管理                 | ChannelReadState テーブル新設。チャンネル入室時にPUT /v1/channels/:id/read   |
| 7   | WebSocket未読反映        | message:new受信で他チャンネルならツリーinvalidate                            |
| 8   | プッシュ通知（FCM/APNs） | バックログ（ChannelReadState基盤は構築済み）                                 |

---

## タスク一覧

| #   | タスク                                                               | 状態   | 備考                                               |
| --- | -------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| D-1 | DB: ChannelReadState テーブル追加                                    | ✅ 完了 | Prismaマイグレーション適用済み                     |
| D-2 | BE: MarkChannelReadUseCase + PUT /v1/channels/:id/read               | ✅ 完了 | upsert方式                                         |
| D-3 | BE: GetCommunityChannelTreeUseCase + GET /v1/channels/community-tree | ✅ 完了 | 未読数・最新メッセージ・スケジュール情報含む       |
| D-4 | FE: CommunityChannelTree コンポーネント新設                          | ✅ 完了 | 再帰的ツリー展開、未読バッジ、アクティビティノード |
| D-5 | FE: ChatListPage をツリー表示に切り替え                              | ✅ 完了 | useCommunityChannelTree を利用                     |
| D-6 | FE: ChannelPage で既読マーク + WebSocket未読反映                     | ✅ 完了 | 入室時markRead + message:newでinvalidate           |

---

## 作業ログ
- 2026-04-12: タスク分解ファイル作成
- 2026-04-19: Phase D 全タスク完了。BE/FE ビルドクリーン
