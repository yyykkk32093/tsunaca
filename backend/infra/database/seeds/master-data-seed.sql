-- ============================================================
-- マスターデータ Seed
-- CategoryMaster / ParticipationLevelMaster / CategoryMatchFormat
-- ============================================================
-- 実行:
--   cd backend && PGPASSWORD=app_password psql -h localhost -p 5432 -U app_user -d reserve_manage \
--     -f infra/database/seeds/master-data-seed.sql
-- ============================================================

BEGIN;

-- ========== 1. CategoryMaster (~100種類) ==========
INSERT INTO "CategoryMaster" ("id", "name", "nameEn", "sortOrder", "createdAt")
VALUES
  -- ■ 汎用
  ('cat-sports-general',    'スポーツ全般',             'Sports General',            0,  NOW()),
  ('cat-other',             'その他',                   'Other',                     99, NOW()),

  -- ■ 球技・チームスポーツ
  ('cat-soccer',            'サッカー',                 'Soccer',                    10, NOW()),
  ('cat-futsal',            'フットサル',               'Futsal',                    11, NOW()),
  ('cat-basketball',        'バスケットボール',         'Basketball',                12, NOW()),
  ('cat-basketball-3x3',    'バスケ3×3',               '3x3 Basketball',            13, NOW()),
  ('cat-volleyball',        'バレーボール',             'Volleyball',                14, NOW()),
  ('cat-soft-volleyball',   'ソフトバレーボール',       'Soft Volleyball',           15, NOW()),
  ('cat-beach-volleyball',  'ビーチバレー',             'Beach Volleyball',          16, NOW()),
  ('cat-handball',          'ハンドボール',             'Handball',                  17, NOW()),
  ('cat-rugby',             'ラグビー（15人制）',       'Rugby Union',               18, NOW()),
  ('cat-rugby-7s',          'ラグビー7人制',            'Rugby Sevens',              19, NOW()),
  ('cat-tag-rugby',         'タグラグビー',             'Tag Rugby',                 20, NOW()),
  ('cat-american-football', 'アメリカンフットボール',   'American Football',         21, NOW()),
  ('cat-flag-football',     'フラッグフットボール',     'Flag Football',             22, NOW()),
  ('cat-softball',          'ソフトボール',             'Softball',                  23, NOW()),
  ('cat-baseball',          '野球（軟式）',             'Baseball (Rubber)',         24, NOW()),
  ('cat-kickbase',          'キックベース',             'Kickbase',                  25, NOW()),
  ('cat-dodgeball',         'ドッジボール',             'Dodgeball',                 26, NOW()),
  ('cat-ultimate',          'アルティメット',           'Ultimate Frisbee',          27, NOW()),
  ('cat-lacrosse',          'ラクロス',                 'Lacrosse',                  28, NOW()),
  ('cat-floorball',         'フロアボール',             'Floorball',                 29, NOW()),
  ('cat-beach-soccer',      'ビーチサッカー',           'Beach Soccer',              30, NOW()),
  ('cat-netball',           'ネットボール',             'Netball',                   31, NOW()),
  ('cat-sepak-takraw',      'セパタクロー',             'Sepak Takraw',              32, NOW()),
  ('cat-water-polo',        '水球',                     'Water Polo',                33, NOW()),
  ('cat-kabaddi',           'カバディ',                 'Kabaddi',                   34, NOW()),
  ('cat-gateball',          'ゲートボール',             'Gateball',                  35, NOW()),
  ('cat-gateball-ground',   'グラウンドゴルフ',         'Ground Golf',               36, NOW()),
  ('cat-park-golf',         'パークゴルフ',             'Park Golf',                 37, NOW()),

  -- ■ ラケットスポーツ
  ('cat-badminton',         'バドミントン',             'Badminton',                 40, NOW()),
  ('cat-tennis',            'テニス',                   'Tennis',                    41, NOW()),
  ('cat-soft-tennis',       'ソフトテニス',             'Soft Tennis',               42, NOW()),
  ('cat-table-tennis',      '卓球',                     'Table Tennis',              43, NOW()),
  ('cat-squash',            'スカッシュ',               'Squash',                    44, NOW()),
  ('cat-padel',             'パデル',                   'Padel',                     45, NOW()),
  ('cat-pickleball',        'ピックルボール',           'Pickleball',                46, NOW()),
  ('cat-beach-tennis',      'ビーチテニス',             'Beach Tennis',              47, NOW()),
  ('cat-racquetball',       'ラケットボール',           'Racquetball',               48, NOW()),
  ('cat-crossminton',       'クロスミントン',           'Crossminton',               49, NOW()),

  -- ■ 武道・格闘技
  ('cat-judo',              '柔道',                     'Judo',                      50, NOW()),
  ('cat-kendo',             '剣道',                     'Kendo',                     51, NOW()),
  ('cat-karate',            '空手',                     'Karate',                    52, NOW()),
  ('cat-sumo',              '相撲',                     'Sumo',                      53, NOW()),
  ('cat-aikido',            '合気道',                   'Aikido',                    54, NOW()),
  ('cat-bjj',               'ブラジリアン柔術',         'Brazilian Jiu-Jitsu',       55, NOW()),
  ('cat-boxing',            'ボクシング',               'Boxing',                    56, NOW()),
  ('cat-kickboxing',        'キックボクシング',         'Kickboxing',                57, NOW()),
  ('cat-wrestling',         'レスリング',               'Wrestling',                 58, NOW()),
  ('cat-kyudo',             '弓道',                     'Kyudo (Archery)',            59, NOW()),
  ('cat-naginata',          'なぎなた',                 'Naginata',                  60, NOW()),
  ('cat-fencing',           'フェンシング',             'Fencing',                   61, NOW()),
  ('cat-taekwondo',         'テコンドー',               'Taekwondo',                 62, NOW()),
  ('cat-muay-thai',         'ムエタイ',                 'Muay Thai',                 63, NOW()),
  ('cat-mma',               '総合格闘技（MMA）',        'MMA',                       64, NOW()),
  ('cat-jukendo',           '銃剣道',                   'Jukendo',                   65, NOW()),

  -- ■ 陸上・ランニング系
  ('cat-running',           'ランニング',               'Running',                   70, NOW()),
  ('cat-marathon',          'マラソン',                 'Marathon',                  71, NOW()),
  ('cat-trail-running',     'トレイルランニング',       'Trail Running',             72, NOW()),
  ('cat-walking',           'ウォーキング',             'Walking',                   73, NOW()),
  ('cat-ekiden',            '駅伝',                     'Ekiden Relay',               74, NOW()),
  ('cat-track-field',       'トラック競技',             'Track & Field',             75, NOW()),
  ('cat-obstacle-race',     '障害物競走（OCR）',        'Obstacle Course Race',      76, NOW()),

  -- ■ 水泳・水上スポーツ
  ('cat-swimming',          '水泳',                     'Swimming',                  80, NOW()),
  ('cat-open-water',        'オープンウォーター',       'Open Water Swimming',       81, NOW()),
  ('cat-triathlon',         'トライアスロン',           'Triathlon',                 82, NOW()),
  ('cat-canoe',             'カヌー/カヤック',          'Canoe / Kayak',             83, NOW()),
  ('cat-rowing',            'ボート（ローイング）',     'Rowing',                    84, NOW()),
  ('cat-surfing',           'サーフィン',               'Surfing',                   85, NOW()),
  ('cat-sup',               'SUP（パドルボード）',      'Stand-Up Paddleboarding',   86, NOW()),
  ('cat-dragon-boat',       'ドラゴンボート',           'Dragon Boat',               87, NOW()),

  -- ■ 体操・ダンス・フィットネス
  ('cat-gymnastics',        '体操',                     'Gymnastics',                90, NOW()),
  ('cat-gymnastics-rhythmic','新体操',                  'Rhythmic Gymnastics',       91, NOW()),
  ('cat-cheerleading',      'チアリーディング',         'Cheerleading',              92, NOW()),
  ('cat-yoga',              'ヨガ',                     'Yoga',                      93, NOW()),
  ('cat-dance',             'ダンス（一般）',           'Dance',                     94, NOW()),
  ('cat-breakdancing',      'ブレイクダンス',           'Breakdancing',              95, NOW()),
  ('cat-dance-sport',       'ダンスポーツ（社交ダンス）','Dancesport',               96, NOW()),
  ('cat-aerobics',          'エアロビクス',             'Aerobics',                  97, NOW()),
  ('cat-pilates',           'ピラティス',               'Pilates',                   98, NOW()),
  ('cat-crossfit',          'クロスフィット',           'CrossFit',                  98, NOW()),
  ('cat-weight-training',   'ウェイトトレーニング',     'Weight Training',           98, NOW()),
  ('cat-climbing',          'クライミング（ボルダリング）','Climbing / Bouldering',  98, NOW()),

  -- ■ アウトドア・レジャースポーツ
  ('cat-cycling',           'サイクリング',             'Cycling',                   91, NOW()),
  ('cat-mtb',               'マウンテンバイク',         'Mountain Biking',           92, NOW()),
  ('cat-golf',              'ゴルフ',                   'Golf',                      93, NOW()),
  ('cat-archery',           'アーチェリー',             'Archery',                   94, NOW()),
  ('cat-survival-game',     'サバゲー',                 'Survival Game (Airsoft)',    95, NOW()),
  ('cat-bowling',           'ボウリング',               'Bowling',                   96, NOW()),

  -- ■ ウィンタースポーツ
  ('cat-ski',               'スキー',                   'Skiing',                    91, NOW()),
  ('cat-snowboard',         'スノーボード',             'Snowboarding',              92, NOW()),
  ('cat-curling',           'カーリング',               'Curling',                   93, NOW()),
  ('cat-ice-hockey',        'アイスホッケー',           'Ice Hockey',                94, NOW()),

  -- ■ マインドスポーツ
  ('cat-shogi',             '将棋',                     'Shogi',                     91, NOW()),
  ('cat-igo',               '囲碁',                     'Go (Igo)',                  92, NOW()),
  ('cat-chess',             'チェス',                   'Chess',                     93, NOW()),
  ('cat-esports',           'eスポーツ',                'Esports',                   94, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name"      = EXCLUDED."name",
  "nameEn"    = EXCLUDED."nameEn",
  "sortOrder" = EXCLUDED."sortOrder";

-- ========== 2. ParticipationLevelMaster ==========
INSERT INTO "ParticipationLevelMaster" ("id", "name", "nameEn", "sortOrder", "createdAt")
VALUES
  ('pl-0', '未経験',     'No Experience',       0, NOW()),
  ('pl-1', 'ビギナー',   'Beginner',            1, NOW()),
  ('pl-2', '初級',       'Elementary',          2, NOW()),
  ('pl-3', '初中級',     'Lower Intermediate',  3, NOW()),
  ('pl-4', '中級',       'Intermediate',        4, NOW()),
  ('pl-5', '中上級',     'Upper Intermediate',  5, NOW()),
  ('pl-6', '上級',       'Advanced',            6, NOW()),
  ('pl-7', '超上級',     'Expert',              7, NOW()),
  ('pl-8', 'プロレベル', 'Pro / Competitive',   8, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name"      = EXCLUDED."name",
  "nameEn"    = EXCLUDED."nameEn",
  "sortOrder" = EXCLUDED."sortOrder";

-- ========== 3. CategoryMatchFormat ==========
-- playersPerGroup: 1組（チーム）あたりの人数
-- groupsPerCourt:  1コートの同時対戦組数（通常2 = 表裏 or A vs B）
INSERT INTO "CategoryMatchFormat" ("id", "categoryId", "name", "playersPerGroup", "groupsPerCourt", "sortOrder", "isDefault", "createdAt", "updatedAt")
VALUES
  -- ■ サッカー
  ('cmf-soccer-11v11',          'cat-soccer',            '11v11',         11, 2, 1, true,  NOW(), NOW()),
  ('cmf-soccer-8v8',            'cat-soccer',            '8v8',            8, 2, 2, false, NOW(), NOW()),
  ('cmf-soccer-7v7',            'cat-soccer',            '7v7',            7, 2, 3, false, NOW(), NOW()),
  ('cmf-soccer-5v5',            'cat-soccer',            '5v5',            5, 2, 4, false, NOW(), NOW()),

  -- ■ フットサル
  ('cmf-futsal-5v5',            'cat-futsal',            '5v5',            5, 2, 1, true,  NOW(), NOW()),
  ('cmf-futsal-6v6',            'cat-futsal',            '6v6',            6, 2, 2, false, NOW(), NOW()),
  ('cmf-futsal-4v4',            'cat-futsal',            '4v4',            4, 2, 3, false, NOW(), NOW()),

  -- ■ バスケットボール
  ('cmf-basketball-5v5',        'cat-basketball',        '5v5',            5, 2, 1, true,  NOW(), NOW()),
  ('cmf-basketball-3v3',        'cat-basketball',        '3v3',            3, 2, 2, false, NOW(), NOW()),

  -- ■ バスケ3×3
  ('cmf-basketball3x3-3v3',     'cat-basketball-3x3',    '3v3',            3, 2, 1, true,  NOW(), NOW()),

  -- ■ バレーボール
  ('cmf-volleyball-6v6',        'cat-volleyball',        '6v6',            6, 2, 1, true,  NOW(), NOW()),
  ('cmf-volleyball-4v4',        'cat-volleyball',        '4v4',            4, 2, 2, false, NOW(), NOW()),

  -- ■ ソフトバレーボール
  ('cmf-soft-vol-4v4',          'cat-soft-volleyball',   '4v4',            4, 2, 1, true,  NOW(), NOW()),

  -- ■ ビーチバレー
  ('cmf-beach-vol-2v2',         'cat-beach-volleyball',  '2v2',            2, 2, 1, true,  NOW(), NOW()),
  ('cmf-beach-vol-4v4',         'cat-beach-volleyball',  '4v4',            4, 2, 2, false, NOW(), NOW()),

  -- ■ ハンドボール
  ('cmf-handball-7v7',          'cat-handball',          '7v7',            7, 2, 1, true,  NOW(), NOW()),
  ('cmf-handball-4v4',          'cat-handball',          '4v4（ビーチ）',  4, 2, 2, false, NOW(), NOW()),

  -- ■ ラグビー15人制
  ('cmf-rugby-15v15',           'cat-rugby',             '15v15',         15, 2, 1, true,  NOW(), NOW()),

  -- ■ ラグビー7人制
  ('cmf-rugby7s-7v7',           'cat-rugby-7s',          '7v7',            7, 2, 1, true,  NOW(), NOW()),

  -- ■ タグラグビー
  ('cmf-tag-rugby-7v7',         'cat-tag-rugby',         '7v7',            7, 2, 1, true,  NOW(), NOW()),
  ('cmf-tag-rugby-5v5',         'cat-tag-rugby',         '5v5',            5, 2, 2, false, NOW(), NOW()),

  -- ■ アメリカンフットボール
  ('cmf-amfoot-11v11',          'cat-american-football', '11v11',         11, 2, 1, true,  NOW(), NOW()),

  -- ■ フラッグフットボール
  ('cmf-flag-5v5',              'cat-flag-football',     '5v5',            5, 2, 1, true,  NOW(), NOW()),

  -- ■ ソフトボール
  ('cmf-softball-9v9',          'cat-softball',          '9v9',            9, 2, 1, true,  NOW(), NOW()),

  -- ■ 野球（軟式）
  ('cmf-baseball-9v9',          'cat-baseball',          '9v9',            9, 2, 1, true,  NOW(), NOW()),
  ('cmf-baseball-7v7',          'cat-baseball',          '7v7',            7, 2, 2, false, NOW(), NOW()),

  -- ■ キックベース
  ('cmf-kickbase-9v9',          'cat-kickbase',          '9v9',            9, 2, 1, true,  NOW(), NOW()),

  -- ■ ドッジボール
  ('cmf-dodgeball-8v8',         'cat-dodgeball',         '8v8',            8, 2, 1, true,  NOW(), NOW()),
  ('cmf-dodgeball-10v10',       'cat-dodgeball',         '10v10',         10, 2, 2, false, NOW(), NOW()),

  -- ■ アルティメット
  ('cmf-ultimate-7v7',          'cat-ultimate',          '7v7',            7, 2, 1, true,  NOW(), NOW()),
  ('cmf-ultimate-5v5',          'cat-ultimate',          '5v5',            5, 2, 2, false, NOW(), NOW()),

  -- ■ ラクロス
  ('cmf-lacrosse-10v10',        'cat-lacrosse',          '10v10',         10, 2, 1, true,  NOW(), NOW()),
  ('cmf-lacrosse-6v6',          'cat-lacrosse',          '6v6',            6, 2, 2, false, NOW(), NOW()),

  -- ■ フロアボール
  ('cmf-floorball-5v5',         'cat-floorball',         '5v5',            5, 2, 1, true,  NOW(), NOW()),

  -- ■ ビーチサッカー
  ('cmf-beach-soccer-5v5',      'cat-beach-soccer',      '5v5',            5, 2, 1, true,  NOW(), NOW()),

  -- ■ ネットボール
  ('cmf-netball-7v7',           'cat-netball',           '7v7',            7, 2, 1, true,  NOW(), NOW()),

  -- ■ セパタクロー
  ('cmf-sepak-3v3',             'cat-sepak-takraw',      '3v3',            3, 2, 1, true,  NOW(), NOW()),

  -- ■ 水球
  ('cmf-waterpolo-7v7',         'cat-water-polo',        '7v7',            7, 2, 1, true,  NOW(), NOW()),

  -- ■ カバディ
  ('cmf-kabaddi-7v7',           'cat-kabaddi',           '7v7',            7, 2, 1, true,  NOW(), NOW()),

  -- ■ ゲートボール
  ('cmf-gateball-5v5',          'cat-gateball',          '5v5',            5, 2, 1, true,  NOW(), NOW()),

  -- ■ グラウンドゴルフ（個人）
  ('cmf-ground-golf-solo',      'cat-gateball-ground',   '個人',           1, 1, 1, true,  NOW(), NOW()),

  -- ■ パークゴルフ（個人）
  ('cmf-park-golf-solo',        'cat-park-golf',         '個人',           1, 1, 1, true,  NOW(), NOW()),

  -- ■ バドミントン
  ('cmf-badminton-singles',     'cat-badminton',         'シングルス',     1, 2, 1, true,  NOW(), NOW()),
  ('cmf-badminton-doubles',     'cat-badminton',         'ダブルス',       2, 2, 2, false, NOW(), NOW()),
  ('cmf-badminton-triples',     'cat-badminton',         'トリプルス',     3, 2, 4, false, NOW(), NOW()),

  -- ■ クロスミントン
  ('cmf-crossminton-singles',   'cat-crossminton',       'シングルス',     1, 2, 1, true,  NOW(), NOW()),
  ('cmf-crossminton-doubles',   'cat-crossminton',       'ダブルス',       2, 2, 2, false, NOW(), NOW()),

  -- ■ テニス
  ('cmf-tennis-singles',        'cat-tennis',            'シングルス',     1, 2, 1, true,  NOW(), NOW()),
  ('cmf-tennis-doubles',        'cat-tennis',            'ダブルス',       2, 2, 2, false, NOW(), NOW()),

  -- ■ ソフトテニス
  ('cmf-soft-tennis-singles',   'cat-soft-tennis',       'シングルス',     1, 2, 1, false, NOW(), NOW()),
  ('cmf-soft-tennis-doubles',   'cat-soft-tennis',       'ダブルス',       2, 2, 2, true,  NOW(), NOW()),

  -- ■ 卓球
  ('cmf-tt-singles',            'cat-table-tennis',      'シングルス',     1, 2, 1, true,  NOW(), NOW()),
  ('cmf-tt-doubles',            'cat-table-tennis',      'ダブルス',       2, 2, 2, false, NOW(), NOW()),
  ('cmf-tt-team',               'cat-table-tennis',      '団体（3人）',    3, 2, 3, false, NOW(), NOW()),

  -- ■ スカッシュ
  ('cmf-squash-singles',        'cat-squash',            'シングルス',     1, 2, 1, true,  NOW(), NOW()),
  ('cmf-squash-doubles',        'cat-squash',            'ダブルス',       2, 2, 2, false, NOW(), NOW()),

  -- ■ パデル
  ('cmf-padel-2v2',             'cat-padel',             '2v2',            2, 2, 1, true,  NOW(), NOW()),

  -- ■ ピックルボール
  ('cmf-pickle-singles',        'cat-pickleball',        'シングルス',     1, 2, 1, false, NOW(), NOW()),
  ('cmf-pickle-doubles',        'cat-pickleball',        'ダブルス',       2, 2, 2, true,  NOW(), NOW()),

  -- ■ ビーチテニス
  ('cmf-beach-tennis-singles',  'cat-beach-tennis',      'シングルス',     1, 2, 1, false, NOW(), NOW()),
  ('cmf-beach-tennis-doubles',  'cat-beach-tennis',      'ダブルス',       2, 2, 2, true,  NOW(), NOW()),

  -- ■ ラケットボール
  ('cmf-racquetball-singles',   'cat-racquetball',       'シングルス',     1, 2, 1, true,  NOW(), NOW()),

  -- ■ 武道・格闘技（基本 1v1）
  ('cmf-judo-1v1',              'cat-judo',              '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-judo-team',             'cat-judo',              '団体（5人）',    5, 2, 2, false, NOW(), NOW()),
  ('cmf-kendo-1v1',             'cat-kendo',             '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-kendo-team',            'cat-kendo',             '団体（3人）',    3, 2, 2, false, NOW(), NOW()),
  ('cmf-karate-1v1',            'cat-karate',            '組手1v1',        1, 2, 1, true,  NOW(), NOW()),
  ('cmf-karate-team',           'cat-karate',            '団体（3人）',    3, 2, 2, false, NOW(), NOW()),
  ('cmf-sumo-1v1',              'cat-sumo',              '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-aikido-1v1',            'cat-aikido',            '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-bjj-1v1',               'cat-bjj',               '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-boxing-1v1',            'cat-boxing',            '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-kickbox-1v1',           'cat-kickboxing',        '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-wrestling-1v1',         'cat-wrestling',         '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-kyudo-solo',            'cat-kyudo',             '個人（射技）',   1, 1, 1, true,  NOW(), NOW()),
  ('cmf-naginata-1v1',          'cat-naginata',          '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-fencing-1v1',           'cat-fencing',           '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-taekwondo-1v1',         'cat-taekwondo',         '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-muaythai-1v1',          'cat-muay-thai',         '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-mma-1v1',               'cat-mma',               '1v1',            1, 2, 1, true,  NOW(), NOW()),

  -- ■ ランニング・陸上（個人）
  ('cmf-running-solo',          'cat-running',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-marathon-solo',         'cat-marathon',          '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-trail-solo',            'cat-trail-running',     '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-walking-solo',          'cat-walking',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-ekiden-team',           'cat-ekiden',            'チーム駅伝',     6, 2, 1, true,  NOW(), NOW()),
  ('cmf-track-solo',            'cat-track-field',       '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-ocr-solo',              'cat-obstacle-race',     '個人',           1, 1, 1, true,  NOW(), NOW()),

  -- ■ 水泳・水上（基本 個人）
  ('cmf-swimming-solo',         'cat-swimming',          '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-open-water-solo',       'cat-open-water',        '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-triathlon-solo',        'cat-triathlon',         '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-canoe-solo',            'cat-canoe',             '1人乗り',        1, 1, 1, true,  NOW(), NOW()),
  ('cmf-canoe-pair',            'cat-canoe',             '2人乗り',        2, 1, 2, false, NOW(), NOW()),
  ('cmf-surfing-solo',          'cat-surfing',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-sup-solo',              'cat-sup',               '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-dragon-boat-team',      'cat-dragon-boat',       'チーム（10人）',10, 2, 1, true,  NOW(), NOW()),

  -- ■ 体操・ダンス・フィットネス（個人 or グループ）
  ('cmf-gymnastics-solo',       'cat-gymnastics',        '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-rhythmic-solo',         'cat-gymnastics-rhythmic','個人',          1, 1, 1, true,  NOW(), NOW()),
  ('cmf-yoga-solo',             'cat-yoga',              '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-dance-solo',            'cat-dance',             '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-break-solo',            'cat-breakdancing',      '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-dance-sport-pair',      'cat-dance-sport',       'ペア',           2, 2, 1, true,  NOW(), NOW()),
  ('cmf-aerobics-solo',         'cat-aerobics',          '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-pilates-solo',          'cat-pilates',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-crossfit-solo',         'cat-crossfit',          '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-weight-solo',           'cat-weight-training',   '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-climbing-solo',         'cat-climbing',          '個人',           1, 1, 1, true,  NOW(), NOW()),

  -- ■ アウトドア・レジャースポーツ
  ('cmf-cycling-solo',          'cat-cycling',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-mtb-solo',              'cat-mtb',               '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-golf-solo',             'cat-golf',              '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-archery-solo',          'cat-archery',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-survival-team',         'cat-survival-game',     'チーム戦',       5, 2, 1, true,  NOW(), NOW()),
  ('cmf-bowling-solo',          'cat-bowling',           '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-bowling-team',          'cat-bowling',           'チーム（5人）',  5, 2, 2, false, NOW(), NOW()),

  -- ■ ウィンタースポーツ
  ('cmf-ski-solo',              'cat-ski',               '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-snowboard-solo',        'cat-snowboard',         '個人',           1, 1, 1, true,  NOW(), NOW()),
  ('cmf-curling-4v4',           'cat-curling',           '4v4',            4, 2, 1, true,  NOW(), NOW()),
  ('cmf-ice-hockey-6v6',        'cat-ice-hockey',        '6v6',            6, 2, 1, true,  NOW(), NOW()),

  -- ■ マインドスポーツ
  ('cmf-shogi-1v1',             'cat-shogi',             '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-igo-1v1',               'cat-igo',               '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-chess-1v1',             'cat-chess',             '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-esports-1v1',           'cat-esports',           '1v1',            1, 2, 1, true,  NOW(), NOW()),
  ('cmf-esports-5v5',           'cat-esports',           '5v5',            5, 2, 2, false, NOW(), NOW()),

  -- ■ その他
  ('cmf-other-2v2',             'cat-other',             '2v2',            2, 2, 1, true,  NOW(), NOW()),
  ('cmf-other-solo',            'cat-other',             '個人',           1, 1, 1, false, NOW(), NOW()),
  ('cmf-sports-general-solo',   'cat-sports-general',    '個人',           1, 1, 1, true,  NOW(), NOW())
ON CONFLICT ("categoryId", "name") DO UPDATE SET
  "playersPerGroup" = EXCLUDED."playersPerGroup",
  "groupsPerCourt"  = EXCLUDED."groupsPerCourt",
  "sortOrder"       = EXCLUDED."sortOrder",
  "isDefault"       = EXCLUDED."isDefault",
  "updatedAt"       = NOW();

COMMIT;

-- ============================================================
-- 削除用（必要時のみコメント解除して実行）
-- ============================================================
-- DELETE FROM "CategoryMatchFormat" WHERE true;
-- DELETE FROM "CommunityParticipationLevel" WHERE true;
-- DELETE FROM "CommunityCategory" WHERE true;
-- DELETE FROM "ParticipationLevelMaster" WHERE true;
-- DELETE FROM "CategoryMaster" WHERE true;
