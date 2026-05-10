# Place OSM Refresh Job — スケルトン

Wave6 Phase6 W6-07 で骨格のみ用意。本実装は **CF-5「OSM開催場所マスタ最新化ジョブ」**（`projects/00_requirements/999999_99_backlog/00_committed-features/overview.md`）で対応。

## 現状（スケルトン）

- `runPlaceOsmRefresh.ts` が `backend/infra/osm/` の `pnpm osm:run-all` を呼び出すのみ
- 月次cron / systemd timer 等から手動でセットアップする想定

## CF-5 で追加する範囲

- スケジューラ統合（cron / EventBridge / systemd timer 等）
- blue/green切替（staging schemaに一旦ロード → 検証クエリ通過後に本番へスワップ）
- 件数異常検知（前回比 ±X% で警告 / 失敗扱い）
- Slack通知（成功・失敗・警告）
- ロールバック手順
- 運用Runbook
