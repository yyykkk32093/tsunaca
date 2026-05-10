import type { AdSlotConfig } from './types'

/**
 * Ad Slot Registry — 全広告スロットの定義
 *
 * ここを変更するだけで全画面の広告配置が変わる。
 * 各 slotId は配置先画面の論理名に対応。
 *
 * @see W5-01-ads.md 配置一覧
 */
export const AD_SLOTS: Record<string, AdSlotConfig> = {
    // ─── [1] お知らせタブ — フィード内（投稿4つに1つ） ───
    'announcement-feed': {
        slotId: 'announcement-feed',
        adUnitId: '',
        type: 'feed',
        feedInterval: 4,
        feedMinItems: 4,
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [2] お知らせタブ — 絞り込みボタン直下 ───
    'announcement-filter-below': {
        slotId: 'announcement-filter-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [3] コミュニティ一覧 — ブックマークボタン直下 ───
    'community-list-bookmark-below': {
        slotId: 'community-list-bookmark-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [4] コミュニティ検索 — 検索テキストボックス直下 ───
    'community-search-below': {
        slotId: 'community-search-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [5] コミュニティ検索詳細 — 参加リクエストボタン直下 ───
    'community-search-detail-below': {
        slotId: 'community-search-detail-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [6] コミュニティ参加 — 参加リクエスト送信ボタン直下 ───
    'community-join-below': {
        slotId: 'community-join-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [7] コミュニティ作成 — 各ステップのボタン直下 ───
    'community-create-step-below': {
        slotId: 'community-create-step-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [8] コミュニティ詳細 — 招待ボタン等の下 ───
    'community-detail-below': {
        slotId: 'community-detail-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [9] アクティビティタブ.タイムライン — フィード内（4つに1つ） ───
    'activity-timeline-feed': {
        slotId: 'activity-timeline-feed',
        adUnitId: '',
        type: 'feed',
        feedInterval: 4,
        feedMinItems: 4,
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [10] アクティビティタブ.タイムライン — 「過去のスケジュールも表示」直下 ───
    'activity-timeline-past-below': {
        slotId: 'activity-timeline-past-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [11] アクティビティタブ.カレンダー — フィード内（3つに1つ） ───
    'activity-calendar-feed': {
        slotId: 'activity-calendar-feed',
        adUnitId: '',
        type: 'feed',
        feedInterval: 3,
        feedMinItems: 3,
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [12] アクティビティタブ.カレンダー — カレンダーUI直下 ───
    'activity-calendar-below': {
        slotId: 'activity-calendar-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [13] チャット一覧 — 検索バー直下 ───
    'chat-list-search-below': {
        slotId: 'chat-list-search-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [14] アクティビティ詳細 — 参加者一覧ボタン下（枠線外） ───
    'activity-detail-participants-below': {
        slotId: 'activity-detail-participants-below',
        adUnitId: '',
        type: 'fixed',
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },

    // ─── [15] 通知一覧 — フィード内（通知4つに1つ） ───
    'notification-feed': {
        slotId: 'notification-feed',
        adUnitId: '',
        type: 'feed',
        feedInterval: 4,
        feedMinItems: 4,
        format: 'responsive',
        marginTop: 24,
        enabled: true,
    },
}
