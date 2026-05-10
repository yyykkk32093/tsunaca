# Wave6 Phase 5 進捗

> **最終更新**: 2026-03-04
> **ステータス**: ✅ Phase 5 完了

## スコープ

| チケット | 内容                              | 状態   | 備考                                                                       |
| -------- | --------------------------------- | ------ | -------------------------------------------------------------------------- |
| W6-09    | スケジュール中止/削除時の通知強化 | ✅ 完了 | キャンセル待ちユーザー追加・単発/全件/Activity全体で文言分岐・UIラベル刷新 |

## 実装サマリ

### BE: `CancelOrDeleteScheduleUseCase`
- `CancelOrDeleteScheduleTxRepositories` に `waitlist: IWaitlistEntryRepository` を追加
- 各 target schedule について `repos.waitlist.findsByScheduleId` を取得し、`getUserId()?.getValue()` を `recipientUserIds` に追加（キャンセル実行者は除外）
- 文言ロジックを単発 / 全件 / Activity全体中止で分岐
  - `isActivityWide = activityDeleted || (scope==='all' && operation==='cancel')`
  - 単発 cancel: `「{title}」のスケジュールが中止されました`
  - 全件 cancel: `アクティビティ「{title}」が中止されました` / 本文 `…の全スケジュールが中止されました。`
  - Activity 削除（activityDeleted=true）: `アクティビティ「{title}」が削除されました` / 本文 `…関連スケジュールはすべて中止されます。`
  - 単発 delete: `「{title}」のスケジュールが削除されました`
- Announcement / Push 双方で同じ `titleText` / `bodyText` を再利用

### `_usecaseFactory.ts`
- `createCancelOrDeleteScheduleUseCase` に `waitlist: new WaitlistEntryRepositoryImpl(tx)` を注入

### FE: `ActivityDetailPage`
- 通知選択ラジオのラベル刷新
  - `announcement`: 「お知らせ投稿 + プッシュ通知」
  - `push_only`: 「プッシュ通知のみ」
  - `none`: 「通知しない」
- 説明文に「キャンセル待ちユーザー」を追記し、誰に届くかを明示

## 検証
- BE `tsc -p tsconfig.server.json` ✅ exit 0
- FE `tsc -p tsconfig.app.json` ✅ exit 0（既存の TS6133 警告のみ）

## 作業ログ
- 2026-03-04: Waitlist を通知 audience に追加、文言を 3 パターン分岐、UI ラベル刷新
