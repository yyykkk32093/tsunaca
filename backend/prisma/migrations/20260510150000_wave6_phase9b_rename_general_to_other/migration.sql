-- Wave6 Phase 9b: 問い合わせカテゴリ「一般的な質問 (general)」を「その他 (Other)」へリネームし、表示順を末尾へ移動
UPDATE "InquiryCategory"
SET "labelI18n" = '{"ja":"その他","en":"Other"}'::jsonb,
    "sortOrder" = 999,
    "updatedAt" = NOW()
WHERE "slug" = 'general';
