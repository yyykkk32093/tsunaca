# Wave6 Phase 4 進捗

> **最終更新**: 2026-03-04
> **ステータス**: ✅ Phase 4 完了

## スコープ

| チケット | 内容                                      | 状態   | 備考                                                                                                                      |
| -------- | ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| W6-06    | Activity 履歴モーダルに開催日入力欄を追加 | ✅ 完了 | `historyDate` state + `min={today}` Input。未入力時は履歴行 disabled                                                      |
| W6-08    | 中止スケジュール復元機能 (BE+FE)          | ✅ 完了 | `RestoreScheduleUseCase` 新設、`POST /v1/schedules/:id/restore`、Payment 紐付き schedule は 409 で拒否＆FE ボタン非活性化 |
| W6-10    | 削除時 notifyOption の二重ガード          | ✅ 完了 | UI: 削除時は通知ラジオ非表示で固定文言提示／BE: `operation==='delete'` の場合 notifyOption を `push_only` に正規化        |

## 実装サマリ

### W6-06 ActivityForm 履歴モーダル
- `frontend/src/features/activity/components/ActivityForm.tsx`
  - `historyDate` ローカル state を追加。`<Input type="date" min={today}>` を履歴ヘッダに配置
  - `applyHistory` で `setValue('date', historyDate)`
  - `historyDate` 未入力時は履歴行ボタンを `disabled`
- 過去日付入力は禁止（作成ルールと一貫）

### W6-08 Restore Schedule
- BE
  - `backend/src/application/schedule/usecase/RestoreScheduleUseCase.ts` 新規作成
    - `IUnitOfWorkWithRepos<{schedule, activity, membership, payment}>` 型 TX
    - 権限: `membership.getRole().canManageMembers()`（OWNER/ADMIN）
    - `payment.findsByScheduleId().length > 0` なら `HttpError 409 SCHEDULE_RESTORE_BLOCKED_BY_PAYMENT`
    - `schedule.restore()` を呼び（中止済 / 開催日が未来 を Domain 側で強制）→ `schedule.save`
    - **通知なし・Outbox なし（サイレント復元）** — Participation/Waitlist は中止時に削除されないため自動復帰
  - `_usecaseFactory.ts` に `createRestoreScheduleUseCase` を追加
  - `scheduleController.restore` + `router.post('/v1/schedules/:id/restore', ...)` を新設
  - `ListSchedulesUseCase` に `IPaymentRepository` を DI し、各 schedule に `hasPayments: boolean` を返却
- FE
  - `scheduleApi.restore(id)` + `useRestoreSchedule(activityId)` を追加
  - `ScheduleListItem.hasPayments?: boolean` を型に追加
  - `ActivityDetailPage.tsx`: タイトル横「中止」ピル隣に `RestoreScheduleButton` を追加
    - 表示条件: ADMIN以上 & `status==='CANCELLED'` & 開催日が今日中以上
    - `hasPayments=true` の場合は `disabled` + tooltip「決済が紐付いているため復元できません」
    - 確認ダイアログ「通知は送信されません」を提示してから実行

### W6-10 Delete-time NotifyOption Guard
- BE: `CancelOrDeleteScheduleUseCase.execute` 冒頭で `operation === 'delete'` のとき `notifyOption` を `push_only` に強制上書き
- FE: `ActivityDetailPage` のキャンセル/削除ダイアログで `dialogOperation === 'delete'` のとき通知ラジオ群を非表示にし、案内文「参加者には『スケジュールが削除されました』とプッシュ通知が送信されます。」を表示

## 検証
- BE `tsc -p tsconfig.server.json` ✅ exit 0
- FE `tsc -p tsconfig.app.json` ✅ exit 0（既存の TS6133 警告のみ）

## 作業ログ
- 2026-03-04: W6-06 / W6-08 / W6-10 を一括実装。ListSchedules 応答に `hasPayments` を追加し復元ボタンの非活性化判定に利用。
