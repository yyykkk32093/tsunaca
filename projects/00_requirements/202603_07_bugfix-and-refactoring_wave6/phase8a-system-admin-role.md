# Wave6 Phase 8-A: SystemAdmin ロール基盤

> Wave6 Phase 7〜9 同時実装の前提となる、プラットフォーム（運営側）権限基盤。
> テナント内権限（`CommunityMembership.role`）とは**別概念**。

---

## 1. 導入したもの

### 1-1. DB スキーマ
- `User.systemRole` カラム追加（`String`、デフォルト `'USER'`）
- 値: `'USER'` | `'OPERATOR'` | `'SUPER_ADMIN'`
  - `USER`: 一般利用者（既存ユーザーは全員 USER）
  - `OPERATOR`: 運営オペレーター（問い合わせ対応・ヘルプ管理）
  - `SUPER_ADMIN`: 全権

マイグレーション: [backend/prisma/migrations/20260427100000_wave6_w6_phase8a_add_user_system_role/migration.sql](../../../backend/prisma/migrations/20260427100000_wave6_w6_phase8a_add_user_system_role/migration.sql)

> **シャドウDB問題回避メモ**: 既存の `20260425174916_apply_pending_place_table_migration` がシャドウDBで再現失敗するため、
> `prisma migrate dev` ではなく **手動 SQL 実行 + `prisma migrate resolve --applied`** で適用した。
> 既存負債の解消は別タスク。

### 1-2. バックエンド
- [backend/src/api/middleware/requireSystemAdmin.ts](../../../backend/src/api/middleware/requireSystemAdmin.ts): 認可ミドルウェア
  - `authMiddleware` の後段に配置
  - 毎回 DB lookup（JWT に systemRole を入れずロール変更を即時反映）
  - 未認可は **404** を返す（管理画面の存在自体を秘匿）
- [backend/src/api/types/express.d.ts](../../../backend/src/api/types/express.d.ts): `req.user.systemRole?` を型拡張
- [backend/src/api/front/auth/session/routes/sessionRoutes.ts](../../../backend/src/api/front/auth/session/routes/sessionRoutes.ts): `/v1/auth/me` レスポンスに `systemRole` を追加

### 1-3. フロントエンド
- [frontend/src/shared/types/api.ts](../../../frontend/src/shared/types/api.ts): `AuthMeResponse.systemRole` 追加
- [frontend/src/app/providers/AuthProvider.tsx](../../../frontend/src/app/providers/AuthProvider.tsx): `AuthUser.systemRole` 追加
- [frontend/src/shared/components/AdminProtectedRoute.tsx](../../../frontend/src/shared/components/AdminProtectedRoute.tsx): 運営権限ガード（未認可は NotFound）
- [frontend/src/features/admin/pages/AdminHomePage.tsx](../../../frontend/src/features/admin/pages/AdminHomePage.tsx): `/admin` プレースホルダ画面
- [frontend/src/app/App.tsx](../../../frontend/src/app/App.tsx): `/admin` ルート骨格を追加

### 1-4. テストデータ
- [backend/infra/database/seeds/testdata/e2e-seed-data.sql](../../../backend/infra/database/seeds/testdata/e2e-seed-data.sql): 運営テストユーザー2名追加
  | ユーザー ID                            | DisplayName | Email                 | systemRole    |
  | -------------------------------------- | ----------- | --------------------- | ------------- |
  | `e2e00000-0000-4000-a000-000000000201` | Operator    | `operator@test.com`   | `OPERATOR`    |
  | `e2e00000-0000-4000-a000-000000000202` | SuperAdmin  | `superadmin@test.com` | `SUPER_ADMIN` |

  パスワード共通: `Test1234!`

---

## 2. 運用 SQL（手動付与）

### 既存ユーザーを運営権限に昇格
```sql
-- OPERATOR に昇格
UPDATE "User" SET "system_role" = 'OPERATOR'
  WHERE "email" = 'someone@example.com';

-- SUPER_ADMIN に昇格
UPDATE "User" SET "system_role" = 'SUPER_ADMIN'
  WHERE "email" = 'someone@example.com';

-- 一般ユーザーへ降格
UPDATE "User" SET "system_role" = 'USER'
  WHERE "email" = 'someone@example.com';
```

### 現在の運営者一覧
```sql
SELECT "id", "displayName", "email", "system_role"
FROM "User"
WHERE "system_role" <> 'USER';
```

---

## 3. 使い方

### バックエンド: 管理 API の保護
```ts
import { authMiddleware } from '@/api/middleware/authMiddleware.js'
import { requireSystemAdmin } from '@/api/middleware/requireSystemAdmin.js'

// OPERATOR / SUPER_ADMIN どちらでも可
router.get('/v1/admin/inquiries', authMiddleware, requireSystemAdmin(), handler)

// SUPER_ADMIN のみ
router.delete('/v1/admin/users/:id', authMiddleware, requireSystemAdmin('SUPER_ADMIN'), handler)
```

### フロントエンド: 管理画面ルートの保護
```tsx
// App.tsx
{
    element: <AdminProtectedRoute />,
    children: [
        { path: '/admin', element: <AdminHomePage /> },
        // Phase 8-C で追加: { path: '/admin/inquiries', ... }
    ],
}
```

---

## 4. 設計上の判断ログ

| #   | 論点                            | 採択                   | 理由                                                              |
| --- | ------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| 1   | systemRole を JWT に含めるか    | **含めない**           | ロール変更を即時反映するため、毎回 DB lookup する                 |
| 2   | 未認可時の HTTP ステータス      | **404**                | 管理画面の存在自体を秘匿し、列挙攻撃を防ぐ                        |
| 3   | enum vs String                  | **String**             | 既存の Prisma schema に enum 利用例がなく、慣習に合わせた         |
| 4   | テナント内 OWNER/ADMIN との関係 | **完全分離**           | 全く別概念。混同するとプラットフォーム権限漏洩のリスク            |
| 5   | OPERATOR と SUPER_ADMIN の違い  | Phase 8-A 時点では同等 | Phase 8-C 以降で「ユーザー削除は SUPER_ADMIN のみ」等の差を入れる |

---

## 5. 関連ドキュメント
- 要件: [projects/00_requirements/202603_07_bugfix-and-refactoring_wave6/overview.md](../overview.md)
- 進捗: [phase8-progress.md](./phase8-progress.md)
- テスト観点: [projects/02_tests/wave6/phase8-tests.md](../../../02_tests/wave6/phase8-tests.md)
