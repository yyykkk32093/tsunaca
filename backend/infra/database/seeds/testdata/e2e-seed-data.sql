-- ============================================================
-- E2E シードデータ（Phase 1〜3）
-- テストユーザー3人 + コミュニティ + アクティビティ + スケジュール
-- + 参加 / キャンセル待ち / アナウンスメント / ブックマーク
-- ============================================================
-- 実行: cd backend && PGPASSWORD=app_password psql -h localhost -p 5432 -U app_user -d reserve_manage -f infra/database/seeds/testdata/e2e-seed-data.sql
-- 削除: 末尾のDELETE文をコメント解除して実行

BEGIN;

-- ============================================================
-- 0. PlanMaster（プランマスタ）
-- ============================================================

INSERT INTO "PlanMaster" ("id", "displayName", "description", "monthlyPrice", "oneTimePrice", "revenuecatProductId", "sortOrder", "availableFrom", "availableTo", "createdAt", "updatedAt")
VALUES
  ('FREE',     'Free',     '基本機能が無料で使えるプラン',               NULL, NULL,  NULL,               1, NULL, NULL, NOW(), NOW()),
  ('LITE',     'Lite',     '広告非表示プラン',                          160,  NULL,  'tsunaca_lite',      2, NULL, NULL, NOW(), NOW()),
  ('PRO',      'Pro',      '全機能が使えるプレミアムプラン',             480,  NULL,  'tsunaca_pro',       3, NULL, NULL, NOW(), NOW()),
  ('LIFETIME', 'Lifetime', 'Pro相当の全機能を永久に使える買い切りプラン', NULL, 5980, 'tsunaca_lifetime',  4, NULL, NULL, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 1. テストユーザー（3人）
-- ============================================================

INSERT INTO "User" ("id", "displayName", "plan", "email", "avatarUrl", "biography", "notificationSetting", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000101', 'Helena', 'PRO', 'helena@test.com', NULL, 'テストユーザー Helena です', '{}', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000102', 'Daniel', 'FREE', 'daniel@test.com', NULL, 'テストユーザー Daniel です', '{}', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000103', 'Sakura', 'FREE', 'sakura@test.com', NULL, 'テストユーザー Sakura です', '{}', NOW(), NOW()),
  -- W6-04 検証用: どのコミュニティにも所属しない outsider ユーザー
  ('e2e00000-0000-4000-a000-000000000104', 'Outsider', 'FREE', 'outsider@test.com', NULL, 'どのコミュニティにも所属しないテストユーザー', '{}', NOW(), NOW()),
  -- Wave6 Phase 8-A 検証用: 運営オペレーター（systemRole='OPERATOR'）
  ('e2e00000-0000-4000-a000-000000000201', 'Operator', 'FREE', 'operator@test.com', NULL, '運営オペレーター用テストユーザー', '{}', NOW(), NOW()),
  -- Wave6 Phase 8-A 検証用: スーパーアドミン（systemRole='SUPER_ADMIN'）
  ('e2e00000-0000-4000-a000-000000000202', 'SuperAdmin', 'FREE', 'superadmin@test.com', NULL, 'スーパーアドミン用テストユーザー', '{}', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Wave6 Phase 8-A: 運営権限の付与（既存 USER から昇格させる場合の運用 SQL も兼ねる）
UPDATE "User" SET "system_role" = 'OPERATOR'
  WHERE "id" = 'e2e00000-0000-4000-a000-000000000201';
UPDATE "User" SET "system_role" = 'SUPER_ADMIN'
  WHERE "id" = 'e2e00000-0000-4000-a000-000000000202';

-- パスワード認証情報
-- ログインパスワード（全ユーザー共通）: Test1234!
INSERT INTO "PasswordCredential" ("userId", "hashedPassword", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000101', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000102', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000103', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000104', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000201', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000202', '$2b$10$/v0yU0NLpEk7tep3BkuWIedxeUksLil3sh6ffw81LmEH.jbdar/Hu', NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- AuthSecurityState
INSERT INTO "auth_security_states" ("user_id", "auth_method", "last_login_at", "failed_sign_in_count", "created_at", "updated_at")
VALUES
  ('e2e00000-0000-4000-a000-000000000101', 'password', NOW(), 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000102', 'password', NOW(), 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000103', 'password', NOW(), 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000104', 'password', NOW(), 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000201', 'password', NOW(), 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000202', 'password', NOW(), 0, NOW(), NOW())
ON CONFLICT ("user_id") DO NOTHING;

-- ============================================================
-- 2. コミュニティ（3つ）
-- ============================================================

-- Helena が作成した「週末フットサル」
INSERT INTO "Community" ("id", "name", "description", "logoUrl", "coverUrl", "grade", "createdBy",
  "joinMethod", "isPublic", "maxMembers", "activityFrequency", "targetGender", "ageMin", "ageMax", "recommendedLevelMin", "recommendedLevelMax",
  "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000201', '週末フットサル', '毎週末にフットサルを楽しむコミュニティです 🏃‍♂️⚽', NULL, NULL, 'FREE', 'e2e00000-0000-4000-a000-000000000101',
   'FREE_JOIN', true, 30, '週１回', '{指定なし}', 20, 49, 1, 4,
   NOW() - INTERVAL '30 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Daniel が作成した「朝ヨガサークル」
INSERT INTO "Community" ("id", "name", "description", "logoUrl", "coverUrl", "grade", "createdBy",
  "joinMethod", "isPublic", "maxMembers", "activityFrequency", "targetGender", "ageMin", "ageMax", "recommendedLevelMin", "recommendedLevelMax",
  "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000202', '朝ヨガサークル', '朝７時から公園でヨガをしています 🧘‍♀️', NULL, NULL, 'FREE', 'e2e00000-0000-4000-a000-000000000102',
   'APPROVAL', true, 15, '週３回', '{指定なし}', 20, 59, 0, 3,
   NOW() - INTERVAL '20 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Sakura が作成した「読書クラブ」
INSERT INTO "Community" ("id", "name", "description", "logoUrl", "coverUrl", "grade", "createdBy",
  "joinMethod", "isPublic", "maxMembers", "activityFrequency", "targetGender",
  "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000203', '読書クラブ', '月１回の読書会。今月のテーマ本を語り合おう 📚', NULL, NULL, 'FREE', 'e2e00000-0000-4000-a000-000000000103',
   'INVITATION', false, NULL, '月１回', '{指定なし}',
   NOW() - INTERVAL '15 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 2b. コミュニティ — カテゴリ（中間テーブル）
-- ============================================================

INSERT INTO "CommunityCategory" ("id", "communityId", "categoryId")
VALUES
  ('e2e00000-0000-4000-a000-000000000211', 'e2e00000-0000-4000-a000-000000000201', 'cat-futsal'),
  ('e2e00000-0000-4000-a000-000000000212',    'e2e00000-0000-4000-a000-000000000202',   'cat-other'),
  ('e2e00000-0000-4000-a000-000000000213',    'e2e00000-0000-4000-a000-000000000203',   'cat-other')
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 2b-2. コミュニティ — 活動拠点 (CommunityLocation)
-- ============================================================

INSERT INTO "CommunityLocation" ("id", "communityId", "type", "area", "station", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000221', 'e2e00000-0000-4000-a000-000000000202', 'MAIN', '新宿区', '新宿御苑前駅', 0, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000222', 'e2e00000-0000-4000-a000-000000000202', 'SUB',  '渋谷区', '代々木公園駅', 1, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000223', 'e2e00000-0000-4000-a000-000000000202', 'SUB',  '中央区', '築地駅',       2, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 2c. コミュニティ — 参加レベル（中間テーブル）
-- ※ Wave5以降は Community.recommendedLevelMin/Max を使用。既存互換用に残す。
-- ============================================================

-- ============================================================
-- 2d. コミュニティ — 活動曜日（値テーブル）
-- ============================================================

INSERT INTO "CommunityActivityDay" ("id", "communityId", "day")
VALUES
  ('e2e00000-0000-4000-a000-000000000241', 'e2e00000-0000-4000-a000-000000000201', '土'),
  ('e2e00000-0000-4000-a000-000000000242', 'e2e00000-0000-4000-a000-000000000201', '日'),
  ('e2e00000-0000-4000-a000-000000000243',   'e2e00000-0000-4000-a000-000000000202',   '月'),
  ('e2e00000-0000-4000-a000-000000000244',   'e2e00000-0000-4000-a000-000000000202',   '水'),
  ('e2e00000-0000-4000-a000-000000000245',   'e2e00000-0000-4000-a000-000000000202',   '金')
ON CONFLICT ("communityId", "day") DO NOTHING;

-- ============================================================
-- 2e. コミュニティ — タグ（値テーブル）
-- ============================================================

INSERT INTO "CommunityTag" ("id", "communityId", "tag")
VALUES
  ('e2e00000-0000-4000-a000-000000000251', 'e2e00000-0000-4000-a000-000000000201', 'フットサル'),
  ('e2e00000-0000-4000-a000-000000000252', 'e2e00000-0000-4000-a000-000000000201', '週末スポーツ'),
  ('e2e00000-0000-4000-a000-000000000253',   'e2e00000-0000-4000-a000-000000000202',   'ヨガ'),
  ('e2e00000-0000-4000-a000-000000000254',   'e2e00000-0000-4000-a000-000000000202',   '朝活'),
  ('e2e00000-0000-4000-a000-000000000255',   'e2e00000-0000-4000-a000-000000000203',   '読書'),
  ('e2e00000-0000-4000-a000-000000000256',   'e2e00000-0000-4000-a000-000000000203',   '読書会')
ON CONFLICT ("communityId", "tag") DO NOTHING;

-- ============================================================
-- 3. メンバーシップ（各コミュニティに全員参加）
-- ============================================================

-- 週末フットサル: Helena=OWNER, Daniel=MEMBER, Sakura=MEMBER
INSERT INTO "CommunityMembership" ("id", "communityId", "userId", "role", "joinedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000301', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000101', 'OWNER',  NOW() - INTERVAL '30 days'),
  ('e2e00000-0000-4000-a000-000000000302', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000102', 'MEMBER', NOW() - INTERVAL '28 days'),
  ('e2e00000-0000-4000-a000-000000000303', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000103', 'MEMBER', NOW() - INTERVAL '25 days')
ON CONFLICT ("id") DO NOTHING;

-- 朝ヨガサークル: Daniel=OWNER, Helena=ADMIN, Sakura=MEMBER
INSERT INTO "CommunityMembership" ("id", "communityId", "userId", "role", "joinedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000304', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000102', 'OWNER',  NOW() - INTERVAL '20 days'),
  ('e2e00000-0000-4000-a000-000000000305', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000101', 'ADMIN',  NOW() - INTERVAL '18 days'),
  ('e2e00000-0000-4000-a000-000000000306', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000103', 'MEMBER', NOW() - INTERVAL '15 days')
ON CONFLICT ("id") DO NOTHING;

-- 読書クラブ: Sakura=OWNER, Helena=MEMBER （Danielは未参加）
INSERT INTO "CommunityMembership" ("id", "communityId", "userId", "role", "joinedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000307', 'e2e00000-0000-4000-a000-000000000203', 'e2e00000-0000-4000-a000-000000000103', 'OWNER',  NOW() - INTERVAL '15 days'),
  ('e2e00000-0000-4000-a000-000000000308', 'e2e00000-0000-4000-a000-000000000203', 'e2e00000-0000-4000-a000-000000000101', 'MEMBER', NOW() - INTERVAL '10 days')
ON CONFLICT ("id") DO NOTHING;

-- Phase10: コミュニティ内レベル（0-8）
UPDATE "CommunityMembership" SET "level" = 7 WHERE "id" = 'e2e00000-0000-4000-a000-000000000301';
UPDATE "CommunityMembership" SET "level" = 5 WHERE "id" = 'e2e00000-0000-4000-a000-000000000302';
UPDATE "CommunityMembership" SET "level" = 3 WHERE "id" = 'e2e00000-0000-4000-a000-000000000303';
UPDATE "CommunityMembership" SET "level" = 6 WHERE "id" = 'e2e00000-0000-4000-a000-000000000304';
UPDATE "CommunityMembership" SET "level" = 4 WHERE "id" = 'e2e00000-0000-4000-a000-000000000305';
UPDATE "CommunityMembership" SET "level" = 2 WHERE "id" = 'e2e00000-0000-4000-a000-000000000306';
UPDATE "CommunityMembership" SET "level" = 4 WHERE "id" = 'e2e00000-0000-4000-a000-000000000307';
UPDATE "CommunityMembership" SET "level" = 5 WHERE "id" = 'e2e00000-0000-4000-a000-000000000308';

-- Phase10: カテゴリ別マッチングフォーマット
INSERT INTO "CategoryMatchFormat" ("id", "categoryId", "name", "playersPerGroup", "groupsPerCourt", "sortOrder", "isDefault", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000291', 'cat-futsal', '5v5', 5, 2, 1, true, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000292', 'cat-futsal', '6v6', 6, 2, 2, false, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000293', 'cat-other', '2v2', 2, 2, 1, true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 4. アクティビティ（各コミュニティに1〜2個）
-- ============================================================

-- 週末フットサル
INSERT INTO "Activity" ("id", "communityId", "title", "description", "defaultLocationCustom", "defaultStartTime", "defaultEndTime",
  "recurrenceRule", "defaultParticipationFee", "defaultVisitorFee", "defaultCapacity", "allowVisitorWaitlist",
  "createdBy", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000401', 'e2e00000-0000-4000-a000-000000000201', '土曜フットサル', '毎週土曜の定期フットサル', '代々木公園フットサルコート', '10:00', '12:00',
   'FREQ=WEEKLY;BYDAY=SA', 500, 800, 20, true,
   'e2e00000-0000-4000-a000-000000000101', NOW() - INTERVAL '28 days', NOW()),
  ('e2e00000-0000-4000-a000-000000000402', 'e2e00000-0000-4000-a000-000000000201', '日曜ミニゲーム', '日曜午後のミニゲーム大会', '駒沢公園', '14:00', '16:00',
   'FREQ=WEEKLY;BYDAY=SU', 0, NULL, 16, false,
   'e2e00000-0000-4000-a000-000000000101', NOW() - INTERVAL '20 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- 朝ヨガサークル
INSERT INTO "Activity" ("id", "communityId", "title", "description", "defaultLocationCustom", "defaultStartTime", "defaultEndTime",
  "recurrenceRule", "defaultParticipationFee", "defaultVisitorFee", "defaultCapacity", "allowVisitorWaitlist",
  "createdBy", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000403', 'e2e00000-0000-4000-a000-000000000202', 'モーニングヨガ', '朝の公園でリフレッシュヨガ', '新宿御苑', '07:00', '08:00',
   'FREQ=WEEKLY;BYDAY=MO,WE,FR', 0, NULL, NULL, false,
   'e2e00000-0000-4000-a000-000000000102', NOW() - INTERVAL '18 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- 読書クラブ（繰り返しなし = 単発、オンライン開催）
INSERT INTO "Activity" ("id", "communityId", "title", "description", "isOnline", "defaultStartTime", "defaultEndTime",
  "recurrenceRule", "defaultParticipationFee", "defaultVisitorFee", "defaultCapacity", "allowVisitorWaitlist",
  "createdBy", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000404', 'e2e00000-0000-4000-a000-000000000203', '月例読書会', '今月のテーマ本についてディスカッション', true, '19:00', '21:00',
   NULL, 0, NULL, 15, false,
   'e2e00000-0000-4000-a000-000000000103', NOW() - INTERVAL '12 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- W6-04 検証用: 公開コミュニティ内で公開アクティビティ/非公開アクティビティの両パターンを用意
--   Activity 401 (土曜フットサル) → PUBLIC（非加入ユーザーも閲覧可）
--   Activity 402 (日曜ミニゲーム) → PRIVATE（既定値、非加入ユーザーは 404）
--   Activity 403 (モーニングヨガ) → PRIVATE（既定値）
--   Activity 404 (月例読書会)     → 親コミュニティ自体が非公開のため非加入ユーザーは 404
UPDATE "Activity" SET "visibility" = 'PUBLIC' WHERE "id" = 'e2e00000-0000-4000-a000-000000000401';

-- ============================================================
-- 4-b. スケジュール（各アクティビティの初回日程）
-- ============================================================

INSERT INTO "Schedule" ("id", "activityId", "date", "startTime", "endTime", "location", "status", "capacity", "participationFee", "visitorFee", "isOnline", "meetingUrl", "createdAt", "updatedAt")
VALUES
  -- 土曜フットサル（繰り返し: 4週分）
  ('e2e00000-0000-4000-a000-000000000501', 'e2e00000-0000-4000-a000-000000000401', '2026-03-14', '10:00', '12:00', '代々木公園フットサルコート', 'SCHEDULED', 20, 500, 800, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000502', 'e2e00000-0000-4000-a000-000000000401', '2026-03-21', '10:00', '12:00', '代々木公園フットサルコート', 'SCHEDULED', 20, 500, 800, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000503', 'e2e00000-0000-4000-a000-000000000401', '2026-03-28', '10:00', '12:00', '代々木公園フットサルコート', 'SCHEDULED', 20, 500, 800, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000504', 'e2e00000-0000-4000-a000-000000000401', '2026-04-04', '10:00', '12:00', '代々木公園フットサルコート', 'SCHEDULED', 20, 500, 800, false, NULL, NOW(), NOW()),
  -- 日曜ミニゲーム（繰り返し: 3週分）
  ('e2e00000-0000-4000-a000-000000000505', 'e2e00000-0000-4000-a000-000000000402', '2026-03-15', '14:00', '16:00', '駒沢公園', 'SCHEDULED', 16, 0, NULL, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000506', 'e2e00000-0000-4000-a000-000000000402', '2026-03-22', '14:00', '16:00', '駒沢公園', 'SCHEDULED', 16, 0, NULL, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000507', 'e2e00000-0000-4000-a000-000000000402', '2026-03-29', '14:00', '16:00', '駒沢公園', 'SCHEDULED', 16, 0, NULL, false, NULL, NOW(), NOW()),
  -- モーニングヨガ（繰り返し: 月水金 × 2週分）
  ('e2e00000-0000-4000-a000-000000000508',       'e2e00000-0000-4000-a000-000000000403', '2026-03-09', '07:00', '08:00', '新宿御苑', 'SCHEDULED', NULL, 0, NULL, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000509',       'e2e00000-0000-4000-a000-000000000403', '2026-03-11', '07:00', '08:00', '新宿御苑', 'SCHEDULED', NULL, 0, NULL, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-00000000050a',       'e2e00000-0000-4000-a000-000000000403', '2026-03-13', '07:00', '08:00', '新宿御苑', 'SCHEDULED', NULL, 0, NULL, false, NULL, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-00000000050b',       'e2e00000-0000-4000-a000-000000000403', '2026-03-16', '07:00', '08:00', '新宿御苑', 'SCHEDULED', NULL, 0, NULL, false, NULL, NOW(), NOW()),
  -- 月例読書会（単発）
  ('e2e00000-0000-4000-a000-00000000050c',       'e2e00000-0000-4000-a000-000000000404', '2026-03-20', '19:00', '21:00', 'オンライン (Zoom)', 'SCHEDULED', 15, 0, NULL, true, 'https://zoom.us/j/1234567890', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 5. アナウンスメント（フィード表示用、時系列をずらす）
-- ============================================================

-- Helena → 週末フットサル: 3件
INSERT INTO "Announcement" ("id", "communityId", "authorId", "title", "content", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000601', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000101',
   '今週末のフットサルについて',
   '今週土曜は雨予報のため、室内コートに変更します。場所は渋谷スポーツセンター B1F です。参加される方は11:00までにお越しください！',
   NOW() - INTERVAL '3 minutes', NOW()),

  ('e2e00000-0000-4000-a000-000000000602', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000101',
   '新メンバー歓迎！',
   '先週から3名の新しいメンバーが加入しました 🎉 次回の集まりで自己紹介タイムを設けますので、皆さんよろしくお願いします。',
   NOW() - INTERVAL '2 hours', NOW()),

  ('e2e00000-0000-4000-a000-000000000603', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000101',
   'ユニフォームの件',
   'チームユニフォームのデザイン案を3つ用意しました。来週の練習後に投票を行いますので、楽しみにしていてください！予算は一人3,000円を想定しています。',
   NOW() - INTERVAL '3 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Daniel → 朝ヨガサークル: 3件
INSERT INTO "Announcement" ("id", "communityId", "authorId", "title", "content", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000604', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000102',
   '明日のヨガは中止です',
   '明日3/4は講師の体調不良のため、モーニングヨガは中止とします。次回は3/6（木）に開催予定です。ご了承ください 🙏',
   NOW() - INTERVAL '30 minutes', NOW()),

  ('e2e00000-0000-4000-a000-000000000605', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000102',
   '春の特別レッスン開催',
   '3月21日（春分の日）に特別レッスンを開催します！テーマは「太陽礼拝マスター」。初心者も大歓迎です。参加費は無料、持ち物はヨガマットのみ。',
   NOW() - INTERVAL '1 day', NOW()),

  ('e2e00000-0000-4000-a000-000000000606', 'e2e00000-0000-4000-a000-000000000202', 'e2e00000-0000-4000-a000-000000000101',
   'ヨガマットのおすすめ',
   '最近買い替えたヨガマットがすごく良かったので共有します。Manduka PRO（6mm）です。グリップ力が段違いで、汗をかいても滑りません。Amazonで15%オフやってました！',
   NOW() - INTERVAL '5 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- Sakura → 読書クラブ: 2件
INSERT INTO "Announcement" ("id", "communityId", "authorId", "title", "content", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000607', 'e2e00000-0000-4000-a000-000000000203', 'e2e00000-0000-4000-a000-000000000103',
   '3月のテーマ本が決まりました',
   '3月のテーマ本は「コンビニ人間」（村田沙耶香）に決定しました📖 読書会は3/22(土) 19:00〜 Zoomで開催します。初参加の方も気軽にどうぞ！',
   NOW() - INTERVAL '4 hours', NOW()),

  ('e2e00000-0000-4000-a000-000000000608', 'e2e00000-0000-4000-a000-000000000203', 'e2e00000-0000-4000-a000-000000000103',
   '2月読書会のまとめ',
   '2月の読書会「推し、燃ゆ」のディスカッションまとめを共有します。「推し活」の意味について深い議論ができました。参加者は8名でした。来月もよろしくお願いします！',
   NOW() - INTERVAL '7 days', NOW())
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 6. 既読データ（一部を既読にしておく）
-- ============================================================

-- Helena は自分の投稿は既読扱い + ヨガの最新を既読
INSERT INTO "AnnouncementRead" ("id", "announcementId", "userId", "readAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000611', 'e2e00000-0000-4000-a000-000000000601', 'e2e00000-0000-4000-a000-000000000101', NOW()),
  ('e2e00000-0000-4000-a000-000000000612', 'e2e00000-0000-4000-a000-000000000602', 'e2e00000-0000-4000-a000-000000000101', NOW()),
  ('e2e00000-0000-4000-a000-000000000613', 'e2e00000-0000-4000-a000-000000000603', 'e2e00000-0000-4000-a000-000000000101', NOW()),
  ('e2e00000-0000-4000-a000-000000000614', 'e2e00000-0000-4000-a000-000000000604',   'e2e00000-0000-4000-a000-000000000101', NOW())
ON CONFLICT ("announcementId", "userId") DO NOTHING;

-- Daniel はフットサルの最新1件を既読
INSERT INTO "AnnouncementRead" ("id", "announcementId", "userId", "readAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000615', 'e2e00000-0000-4000-a000-000000000601', 'e2e00000-0000-4000-a000-000000000102', NOW()),
  ('e2e00000-0000-4000-a000-000000000616', 'e2e00000-0000-4000-a000-000000000604',   'e2e00000-0000-4000-a000-000000000102', NOW()),
  ('e2e00000-0000-4000-a000-000000000617', 'e2e00000-0000-4000-a000-000000000605',   'e2e00000-0000-4000-a000-000000000102', NOW()),
  ('e2e00000-0000-4000-a000-000000000618', 'e2e00000-0000-4000-a000-000000000606',   'e2e00000-0000-4000-a000-000000000102', NOW())
ON CONFLICT ("announcementId", "userId") DO NOTHING;

-- ============================================================
-- 6b. アナウンスメント — ブックマーク
-- ============================================================

-- Helena はフットサルの最新＋読書会をブックマーク
INSERT INTO "AnnouncementBookmark" ("id", "announcementId", "userId", "createdAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000621', 'e2e00000-0000-4000-a000-000000000601', 'e2e00000-0000-4000-a000-000000000101', NOW()),
  ('e2e00000-0000-4000-a000-000000000622', 'e2e00000-0000-4000-a000-000000000607',   'e2e00000-0000-4000-a000-000000000101', NOW())
ON CONFLICT ("announcementId", "userId") DO NOTHING;

-- Daniel はヨガの特別レッスンをブックマーク
INSERT INTO "AnnouncementBookmark" ("id", "announcementId", "userId", "createdAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000623', 'e2e00000-0000-4000-a000-000000000605', 'e2e00000-0000-4000-a000-000000000102', NOW())
ON CONFLICT ("announcementId", "userId") DO NOTHING;

-- ============================================================
-- 7. スケジュール参加データ（メイン日程）
-- ============================================================

-- フットサル土曜 3/15: Helena=参加, Daniel=参加, Sakura=参加
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000701', 'e2e00000-0000-4000-a000-000000000501', 'e2e00000-0000-4000-a000-000000000101', false, NOW()),
  ('e2e00000-0000-4000-a000-000000000702', 'e2e00000-0000-4000-a000-000000000501', 'e2e00000-0000-4000-a000-000000000102', false, NOW()),
  ('e2e00000-0000-4000-a000-000000000703', 'e2e00000-0000-4000-a000-000000000501', 'e2e00000-0000-4000-a000-000000000103', false, NOW())
ON CONFLICT DO NOTHING;

-- フットサル土曜 3/15: Payment データ
INSERT INTO "Payment" ("id", "participationId", "userId", "scheduleId", "amount", "paymentMethod", "status", "displayName", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000801', 'e2e00000-0000-4000-a000-000000000701', 'e2e00000-0000-4000-a000-000000000101', 'e2e00000-0000-4000-a000-000000000501', 500, 'PAYPAY', 'CONFIRMED', 'Helena', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000802', 'e2e00000-0000-4000-a000-000000000702', 'e2e00000-0000-4000-a000-000000000102', 'e2e00000-0000-4000-a000-000000000501', 500, 'CASH',   'UNPAID',    'Daniel', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- フットサル土曜 3/22: Helena=参加
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000704', 'e2e00000-0000-4000-a000-000000000502', 'e2e00000-0000-4000-a000-000000000101', false, NOW())
ON CONFLICT DO NOTHING;

-- ヨガ 3/10: Daniel=参加, Sakura=参加
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000705', 'e2e00000-0000-4000-a000-000000000508', 'e2e00000-0000-4000-a000-000000000102', false, NOW()),
  ('e2e00000-0000-4000-a000-000000000706', 'e2e00000-0000-4000-a000-000000000508', 'e2e00000-0000-4000-a000-000000000103', false, NOW())
ON CONFLICT DO NOTHING;

-- 読書会 3/20: Sakura=参加, Helena=参加（オンライン）
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000707', 'e2e00000-0000-4000-a000-00000000050c', 'e2e00000-0000-4000-a000-000000000103', false, NOW()),
  ('e2e00000-0000-4000-a000-000000000708', 'e2e00000-0000-4000-a000-00000000050c', 'e2e00000-0000-4000-a000-000000000101', false, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7b. キャンセル待ちデータ
-- ============================================================

-- フットサル日曜 3/16 (capacity=16): Sakura がキャンセル待ち（登録ユーザー）
INSERT INTO "WaitlistEntry" ("id", "scheduleId", "userId", "isVisitor", "registeredAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000901', 'e2e00000-0000-4000-a000-000000000505', 'e2e00000-0000-4000-a000-000000000103', false, NOW())
ON CONFLICT DO NOTHING;

-- フットサル土曜 3/28: ゲストビジターのキャンセル待ち（userId=NULL, addedBy付き）
INSERT INTO "WaitlistEntry" ("id", "scheduleId", "userId", "isVisitor", "visitorName", "addedBy", "registeredAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000902', 'e2e00000-0000-4000-a000-000000000503', NULL, true, '田中一郎', 'e2e00000-0000-4000-a000-000000000101', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ========== 9. 統計確認用データ（Phase 4 / UBL-17〜22） ==========
-- Helena が所属する PREMIUM コミュニティにスケジュール＋参加データを追加
-- （テスト用。統計画面で棒グラフ・折れ線グラフの動作確認に使用）

BEGIN;

-- Schedule: フットサル 3月分（統計テスト用）
INSERT INTO "Schedule" ("id", "activityId", "date", "startTime", "endTime", "location", "status", "capacity", "participationFee", "isOnline", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-00000000050d', 'e2e00000-0000-4000-a000-000000000401', '2026-03-01', '19:00', '21:00', 'テスト体育館', 'SCHEDULED', 10, 500, false, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-00000000050e', 'e2e00000-0000-4000-a000-000000000401', '2026-03-08', '19:00', '21:00', 'テスト体育館', 'SCHEDULED', 10, 500, false, NOW(), NOW()),
  ('e2e00000-0000-4000-a000-00000000050f', 'e2e00000-0000-4000-a000-000000000401', '2026-03-15', '19:00', '21:00', 'テスト体育館', 'SCHEDULED', 10, 500, false, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Participation: Helena, Daniel の参加（CANCELLED は Participation には入れない＝レコードが存在しない）
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000709', 'e2e00000-0000-4000-a000-00000000050d', 'e2e00000-0000-4000-a000-000000000101', false, '2026-02-28T10:00:00Z'),
  ('e2e00000-0000-4000-a000-00000000070a', 'e2e00000-0000-4000-a000-00000000050d', 'e2e00000-0000-4000-a000-000000000102', false, '2026-02-28T12:00:00Z'),
  ('e2e00000-0000-4000-a000-00000000070b', 'e2e00000-0000-4000-a000-00000000050e', 'e2e00000-0000-4000-a000-000000000101', false, '2026-03-05T10:00:00Z'),
  ('e2e00000-0000-4000-a000-00000000070c', 'e2e00000-0000-4000-a000-00000000050e', 'e2e00000-0000-4000-a000-000000000102', false, '2026-03-05T12:00:00Z'),
  ('e2e00000-0000-4000-a000-00000000070d', 'e2e00000-0000-4000-a000-00000000050f', 'e2e00000-0000-4000-a000-000000000101', false, '2026-03-12T10:00:00Z')
ON CONFLICT DO NOTHING;

-- Payment: 統計テスト用
INSERT INTO "Payment" ("id", "participationId", "userId", "scheduleId", "amount", "paymentMethod", "status", "displayName", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000803', 'e2e00000-0000-4000-a000-000000000709', 'e2e00000-0000-4000-a000-000000000101', 'e2e00000-0000-4000-a000-00000000050d', 500, 'PAYPAY', 'CONFIRMED', 'Helena', '2026-02-28T10:00:00Z', '2026-02-28T10:00:00Z'),
  ('e2e00000-0000-4000-a000-000000000804', 'e2e00000-0000-4000-a000-00000000070a', 'e2e00000-0000-4000-a000-000000000102', 'e2e00000-0000-4000-a000-00000000050d', 500, 'CASH',   'UNPAID',    'Daniel', '2026-02-28T12:00:00Z', '2026-02-28T12:00:00Z'),
  ('e2e00000-0000-4000-a000-000000000805', 'e2e00000-0000-4000-a000-00000000070b', 'e2e00000-0000-4000-a000-000000000101', 'e2e00000-0000-4000-a000-00000000050e', 500, 'PAYPAY', 'CONFIRMED', 'Helena', '2026-03-05T10:00:00Z', '2026-03-05T10:00:00Z'),
  ('e2e00000-0000-4000-a000-000000000806', 'e2e00000-0000-4000-a000-00000000070c', 'e2e00000-0000-4000-a000-000000000102', 'e2e00000-0000-4000-a000-00000000050e', 500, 'CASH',   'CONFIRMED', 'Daniel', '2026-03-05T12:00:00Z', '2026-03-05T12:00:00Z'),
  ('e2e00000-0000-4000-a000-000000000807', 'e2e00000-0000-4000-a000-00000000070d', 'e2e00000-0000-4000-a000-000000000101', 'e2e00000-0000-4000-a000-00000000050f', 500, 'PAYPAY', 'UNPAID',    'Helena', '2026-03-12T10:00:00Z', '2026-03-12T10:00:00Z')
ON CONFLICT DO NOTHING;

COMMIT;

-- ========== 10. ビジター＆経費テストデータ（Phase 4 新機能） ==========

BEGIN;

-- ゲストビジター参加データ（userId=NULL）
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "visitorName", "addedBy", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-00000000070e', 'e2e00000-0000-4000-a000-000000000501', NULL, true, '山田太郎', 'e2e00000-0000-4000-a000-000000000101', NOW()),
  ('e2e00000-0000-4000-a000-00000000070f', 'e2e00000-0000-4000-a000-000000000501', NULL, true, '佐藤花子', 'e2e00000-0000-4000-a000-000000000102', NOW())
ON CONFLICT DO NOTHING;

-- Phase10: ビジターレベル（0-8）
UPDATE "Participation" SET "visitorLevel" = 4 WHERE "id" = 'e2e00000-0000-4000-a000-00000000070e';
UPDATE "Participation" SET "visitorLevel" = 2 WHERE "id" = 'e2e00000-0000-4000-a000-00000000070f';

-- 登録済みビジター参加データ（userId=set, isVisitor=true）
INSERT INTO "Participation" ("id", "scheduleId", "userId", "isVisitor", "respondedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000710', 'e2e00000-0000-4000-a000-000000000502', 'e2e00000-0000-4000-a000-000000000103', true, NOW())
ON CONFLICT DO NOTHING;

-- ゲストビジターの Payment データ
INSERT INTO "Payment" ("id", "participationId", "userId", "scheduleId", "amount", "paymentMethod", "status", "displayName", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000808', 'e2e00000-0000-4000-a000-00000000070e', NULL, 'e2e00000-0000-4000-a000-000000000501', 800, NULL, 'UNPAID', '山田太郎', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000809', 'e2e00000-0000-4000-a000-00000000070f', NULL, 'e2e00000-0000-4000-a000-000000000501', 800, 'CASH', 'CONFIRMED', '佐藤花子', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-00000000080a', 'e2e00000-0000-4000-a000-000000000710', 'e2e00000-0000-4000-a000-000000000103', 'e2e00000-0000-4000-a000-000000000502', 800, 'PAYPAY', 'UNPAID', 'Sakura', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10b. 経費カテゴリ（システムプリセット）
-- ============================================================

INSERT INTO "ExpenseCategory" ("id", "communityId", "name", "isSystem", "sortOrder", "isActive", "createdAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000a01',  NULL, '飲み会',       true, 1, true, NOW()),
  ('e2e00000-0000-4000-a000-000000000a02', NULL, '設備利用料',   true, 2, true, NOW()),
  ('e2e00000-0000-4000-a000-000000000a03',   NULL, '消耗品',       true, 3, true, NOW()),
  ('e2e00000-0000-4000-a000-000000000a04',  NULL, 'ユニフォーム', true, 4, true, NOW()),
  ('e2e00000-0000-4000-a000-000000000a05',     NULL, '未分類',       true, 5, true, NOW())
ON CONFLICT DO NOTHING;

-- フットサルコミュニティ用のカスタムカテゴリ
INSERT INTO "ExpenseCategory" ("id", "communityId", "name", "isSystem", "sortOrder", "isActive", "createdAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000a06', 'e2e00000-0000-4000-a000-000000000201', 'ボール購入', false, 10, true, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10c. 経費データ（フットサルコミュニティ）
-- ============================================================

INSERT INTO "Expense" ("id", "communityId", "categoryId", "amount", "description", "date", "createdBy", "createdAt", "updatedAt")
VALUES
  ('e2e00000-0000-4000-a000-000000000b01', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000a02', 3000,  'コート利用料 3/15',   '2026-03-15', 'e2e00000-0000-4000-a000-000000000101', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000b02', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000a02', 3000,  'コート利用料 3/22',   '2026-03-22', 'e2e00000-0000-4000-a000-000000000101', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000b03', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000a03',   1500,  'ビブス 10枚セット',   '2026-03-10', 'e2e00000-0000-4000-a000-000000000101', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000b04', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000a06', 4500, 'フットサルボール 5号', '2026-03-05', 'e2e00000-0000-4000-a000-000000000101', NOW(), NOW()),
  ('e2e00000-0000-4000-a000-000000000b05', 'e2e00000-0000-4000-a000-000000000201', 'e2e00000-0000-4000-a000-000000000a01',  8000,  '打ち上げ（居酒屋）',  '2026-03-15', 'e2e00000-0000-4000-a000-000000000101', NOW(), NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- テストデータ削除用（必要時にコメント解除して実行）
-- ============================================================
-- BEGIN;
-- DELETE FROM "Expense" WHERE "id" LIKE 'e2e00000-0000-4000-a000-000000000b%';
-- DELETE FROM "ExpenseCategory" WHERE "id" LIKE 'e2e00000-0000-4000-a000-000000000a%';
-- DELETE FROM "Payment" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000080%';
-- DELETE FROM "WaitlistEntry" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000090%';
-- DELETE FROM "Participation" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000070%';
-- DELETE FROM "Schedule" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000050%';
-- DELETE FROM "AnnouncementBookmark" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000062%';
-- DELETE FROM "AnnouncementRead" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000061%';
-- DELETE FROM "Announcement" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000060%';
-- DELETE FROM "Activity" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000040%';
-- DELETE FROM "CommunityMembership" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000030%';
-- DELETE FROM "CommunityTag" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000025%';
-- DELETE FROM "CommunityActivityDay" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000024%';
-- DELETE FROM "CommunityParticipationLevel" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000023%';
-- DELETE FROM "CommunityCategory" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000021%';
-- DELETE FROM "CommunityLocation" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000022%';
-- DELETE FROM "Community" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000020%';
-- DELETE FROM "PasswordCredential" WHERE "userId" LIKE 'e2e00000-0000-4000-a000-00000000010%';
-- DELETE FROM "auth_security_states" WHERE "user_id" LIKE 'e2e00000-0000-4000-a000-00000000010%';
-- DELETE FROM "User" WHERE "id" LIKE 'e2e00000-0000-4000-a000-00000000010%';
-- DELETE FROM "PlanMaster" WHERE "id" IN ('FREE', 'LITE', 'PRO', 'LIFETIME');
-- COMMIT;
