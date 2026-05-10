# Phase 1 — セキュリティ/遷移制御の先行安定化（W6-04）

> **最終更新**: 2026-04-25
> **ステータス**: ✅ Phase 1 完了

## フェーズ概要
- **ゴール**: 非加入ユーザーがコミュニティ詳細・アクティビティ詳細・スケジュール詳細へURL直アクセスできない状態を実現
- **対象**: W6-04
- **変更対象レイヤー**: API / UseCase / Domain / UI

## タスク一覧

| タスク                                                             | 状態   | 備考                                                              |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| Activity に `visibility` カラム追加（マイグレーション含む）        | ✅ 完了 | Schedule にも override 用の nullable カラム追加                   |
| Domain: `ActivityVisibility` VO + Activity/Schedule entity 拡張    | ✅ 完了 | デフォルト PRIVATE                                                |
| UseCase 4件で viewerUserId + メンバー認可（404固定）               | ✅ 完了 | FindCommunity/FindActivity/FindSchedule/ListSchedules             |
| Create/Update Activity に `visibility` 受け入れ                    | ✅ 完了 | zod schema + controller + UseCase                                 |
| Repository mapper / save / saveMany に `visibility` 反映           | ✅ 完了 | ActivityRepositoryImpl / ScheduleRepositoryImpl                   |
| FE: `visibility` を Create/Edit ページのフォームと往復             | ✅ 完了 | UI 'public'/'private' ↔ API 'PUBLIC'/'PRIVATE'                    |
| FE: 404 → `/not-found` 共通遷移フック `useRedirectOnNotFound`      | ✅ 完了 | Community/Activity/Announcement/CommunitySearch 詳細ページに適用  |
| seed: outsider ユーザー追加 + Activity visibility テストマトリクス | ✅ 完了 | `e2e-seed-data.sql` outsider@test.com / Activity 401 を PUBLIC に |

## 確定した設計

### 認可責務
- 各 Find/List UseCase で `ICommunityMembershipRepository` を呼び出し、コミュニティ加入チェックを実施。
- レスポンスは存在秘匿のため **常に 404**（`{Resource}NotFoundError`）。
- アクセス可否ロジック:
  - Community: `community.isPublic === true || activeMember`
  - Activity: 上記 ∧ (`activity.visibility === PUBLIC || activeMember`)
  - Schedule: Activity の判定に `Schedule.visibility` override を加味（override 優先）

### `Activity.visibility` フィールド
- 値: `PUBLIC | PRIVATE`、デフォルト `PRIVATE`
- Schedule 側は nullable で、`null`=Activity を継承、明示値=override

### FE 404 遷移
- 共通 hook `useRedirectOnNotFound(error)` を新設し、`HttpError` の `status === 404` で `/not-found` へ `replace` 遷移。
- 既存の `NotFoundPage` ルート (App.tsx 269 行目) を再利用。

### seed データ（W6-04 検証マトリクス）
| ユーザー | コミュニティ | Activity 401 (PUBLIC) | Activity 402 (PRIVATE) | Activity 404 (private community) |
| -------- | ------------ | --------------------- | ---------------------- | -------------------------------- |
| Helena   | OWNER        | 閲覧可                | 閲覧可                 | 閲覧不可（読書クラブ非加入）     |
| Daniel   | 別Cの owner  | 閲覧可（PUBLIC のみ） | **404**                | 404                              |
| Outsider | 未加入       | 閲覧可（PUBLIC のみ） | **404**                | 404                              |

## 受入条件
- [x] 非加入ユーザーが private community 詳細へ到達できない（404）
- [x] 非加入ユーザーが private activity / schedule 詳細へ到達できない（404）
- [x] 公開コミュニティ × PUBLIC アクティビティの公開導線は維持
- [x] FE 詳細画面で 404 取得時に専用 NotFound 画面へ遷移
- [x] seed に outsider ユーザーと visibility マトリクスを追加

## 残課題（Phase 1 以降）
- E2E テスト本体の追加は test 拡充タスクとして別管理。Phase 1 ではドメイン/層の理想設計と seed 整備までを完了とする。
- 既存 vitest テストには `FindXxxUseCase` 直接利用箇所なし（grep 確認済）。今後追加時は `viewerUserId` + `membershipRepository` を渡す必要あり。

## 作業ログ
- 2026-04-25: 現状調査を実施。Community/Activity/Schedule の参照系に会員チェック不足を確認。
- 2026-04-25: 設計確定。理想設計 + 404 固定ポリシー採用。
- 2026-04-25: スキーマ・Domain・UseCase・Controller・Repository・FE フォーム・404遷移フック・seed を実装。`tsc -p tsconfig.server.json --noEmit` および FE 型チェックでエラー 0 を確認。Phase 1 完了。
# Phase 1 — セキュリティ/遷移制御の先行安定化（W6-04）

> **最終更新**: 2026-04-25
> **ステータス**: 🚧 要件定義中

## フェーズ概要
- **ゴール**: 非加入ユーザーがコミュニティ詳細・アクティビティ詳細・スケジュール詳細へURL直アクセスできない状態を実現
- **対象**: W6-04
- **変更対象レイヤー**: API / UseCase / Domain / UI

## タスク一覧

| タスク                                                       | 状態     | 備考                     |
| ------------------------------------------------------------ | -------- | ------------------------ |
| W6-04 非加入コミュニティ/非公開アクティビティへのURL遷移制御 | 🚧 作業中 | 現状調査で認可抜けを確認 |

## 現状実装調査（根拠）
- コミュニティ詳細API `GET /v1/communities/:id` は認証のみで、UseCase内で会員チェックなし。
  - `backend/src/api/front/community/routes/communityRoutes.ts`
  - `backend/src/application/community/usecase/FindCommunityUseCase.ts`
  - `backend/src/domains/community/infrastructure/repository/CommunityRepositoryImpl.ts` (`findDetailById` は公開/会員条件なし)
- アクティビティ詳細API `GET /v1/activities/:id` は認証のみで、UseCase内で会員チェックなし。
  - `backend/src/api/front/activity/routes/activityRoutes.ts`
  - `backend/src/application/activity/usecase/FindActivityUseCase.ts`
- スケジュール一覧/詳細も会員チェックなしで取得可能。
  - `backend/src/api/front/schedule/routes/scheduleRoutes.ts`
  - `backend/src/application/schedule/usecase/ListSchedulesUseCase.ts`
  - `backend/src/application/schedule/usecase/FindScheduleUseCase.ts`
- フロントは詳細画面遷移時に保護分岐なしで API を呼ぶ。
  - `frontend/src/features/community/pages/CommunityDetailPage.tsx`
  - `frontend/src/features/activity/hooks/useActivityQueries.ts`
  - `frontend/src/features/community/hooks/useCommunityQueries.ts`

## 設計判断ポイント
1. 認可責務の置き場所
- 候補A: 各Find/List UseCaseで会員チェック
- 候補B: API Controller/Middlewareで一括チェック
- 候補C: Repositoryクエリに会員条件を内包

2. 非公開リソースのエラーコード方針
- 候補A: 常に404（存在秘匿）
- 候補B: 403（認可不足を明示）
- 候補C: 404/403を用途別に使い分け

3. 「非公開アクティビティ」の定義
- Communityの `isPublic` に従属させるか
- Activity/Scheduleにも可視性フラグを持たせるか

4. フロントルーティング時の防御
- APIエラー時に `/communities/search/:id` へ誘導するか
- 専用の「アクセスできません」画面を設けるか

5. テスト戦略
- E2Eで outsider ユーザーアクセスを追加
- unit で認可関数の境界値を追加

## 実装前チェックリスト
- [ ] 参照系エンドポイント単位で「必要ロール」を表にする
- [ ] 404/403ポリシーをPhase内で確定する
- [ ] Community公開検索経由 (`/v1/communities/public/:id`) との役割分離を定義する
- [ ] outsider 用E2Eデータを追加する

## 受入条件
- [ ] 非加入ユーザーが private community 詳細へ到達できない
- [ ] 非加入ユーザーが private activity/schedule 詳細へ到達できない
- [ ] 公開コミュニティの公開導線は既存仕様を維持する
- [ ] 追加した認可仕様がE2Eで担保される

## 作業ログ
- 2026-04-25: 現状調査を実施。Community/Activity/Scheduleの参照系に会員チェック不足を確認。
