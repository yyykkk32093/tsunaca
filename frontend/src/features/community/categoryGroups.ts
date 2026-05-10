/**
 * カテゴリ大分類辞書（FE専用 / BE 拡張なし）。
 *
 * `master-data-seed.sql` のコメント区分を id ベースで再現。
 * sortOrder は seed 内で範囲が重複しているため id をキーにする。
 * 新規カテゴリ追加時は本辞書も追従更新すること。
 */

export interface CategoryGroup {
    key: string
    label: string
    /** このグループに属するカテゴリ id（master-data-seed.sql の id を列挙） */
    ids: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
    {
        key: 'general',
        label: '汎用',
        ids: ['cat-sports-general', 'cat-other'],
    },
    {
        key: 'team-ball',
        label: '球技・チームスポーツ',
        ids: [
            'cat-soccer', 'cat-futsal', 'cat-basketball', 'cat-basketball-3x3',
            'cat-volleyball', 'cat-soft-volleyball', 'cat-beach-volleyball',
            'cat-handball', 'cat-rugby', 'cat-rugby-7s', 'cat-tag-rugby',
            'cat-american-football', 'cat-flag-football',
            'cat-softball', 'cat-baseball', 'cat-kickbase', 'cat-dodgeball',
            'cat-ultimate', 'cat-lacrosse', 'cat-floorball', 'cat-beach-soccer',
            'cat-netball', 'cat-sepak-takraw', 'cat-water-polo', 'cat-kabaddi',
            'cat-gateball', 'cat-gateball-ground', 'cat-park-golf',
        ],
    },
    {
        key: 'racket',
        label: 'ラケットスポーツ',
        ids: [
            'cat-badminton', 'cat-tennis', 'cat-soft-tennis', 'cat-table-tennis',
            'cat-squash', 'cat-padel', 'cat-pickleball', 'cat-beach-tennis',
            'cat-racquetball', 'cat-crossminton',
        ],
    },
    {
        key: 'martial-arts',
        label: '武道・格闘技',
        ids: [
            'cat-judo', 'cat-kendo', 'cat-karate', 'cat-sumo', 'cat-aikido',
            'cat-bjj', 'cat-boxing', 'cat-kickboxing', 'cat-wrestling',
            'cat-kyudo', 'cat-naginata', 'cat-fencing', 'cat-taekwondo',
            'cat-muay-thai', 'cat-mma', 'cat-jukendo',
        ],
    },
    {
        key: 'athletics',
        label: '陸上・ランニング系',
        ids: [
            'cat-running', 'cat-marathon', 'cat-trail-running', 'cat-walking',
            'cat-ekiden', 'cat-track-field', 'cat-obstacle-race',
        ],
    },
    {
        key: 'water',
        label: '水泳・水上スポーツ',
        ids: [
            'cat-swimming', 'cat-open-water', 'cat-triathlon', 'cat-canoe',
            'cat-rowing', 'cat-surfing', 'cat-sup', 'cat-dragon-boat',
        ],
    },
    {
        key: 'gym-dance',
        label: '体操・ダンス・フィットネス',
        ids: [
            'cat-gymnastics', 'cat-gymnastics-rhythmic', 'cat-cheerleading',
            'cat-yoga', 'cat-dance', 'cat-breakdancing', 'cat-dance-sport',
            'cat-aerobics', 'cat-pilates', 'cat-crossfit',
            'cat-weight-training', 'cat-climbing',
        ],
    },
    {
        key: 'outdoor',
        label: 'アウトドア・レジャースポーツ',
        ids: [
            'cat-cycling', 'cat-mtb', 'cat-golf', 'cat-archery',
            'cat-survival-game', 'cat-bowling',
        ],
    },
    {
        key: 'winter',
        label: 'ウィンタースポーツ',
        ids: ['cat-ski', 'cat-snowboard', 'cat-curling', 'cat-ice-hockey'],
    },
    {
        key: 'mind',
        label: 'マインドスポーツ',
        ids: ['cat-shogi', 'cat-igo', 'cat-chess', 'cat-esports'],
    },
]

/** カテゴリ id → グループ key の逆引き */
export const CATEGORY_GROUP_BY_ID: Record<string, string> = (() => {
    const map: Record<string, string> = {}
    for (const g of CATEGORY_GROUPS) {
        for (const id of g.ids) map[id] = g.key
    }
    return map
})()

/** 未分類カテゴリ用の仮想グループ key */
export const UNCATEGORIZED_GROUP_KEY = '__uncategorized__'
