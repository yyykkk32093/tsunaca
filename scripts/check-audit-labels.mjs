#!/usr/bin/env node
/**
 * Wave6 W6-03: 監査ログラベル辞書 vs Prisma スキーマ 差分チェック
 *
 * - frontend/src/shared/audit-labels/index.ts の AUDIT_FIELD_LABELS をパース
 * - backend/prisma/schema.prisma の Community model のフィールド一覧を抽出
 * - Community model にあるが辞書に未登録のフィールドを警告として一覧表示
 *
 * 完全一致を強制するわけではなく（システムフィールドや関係性は監査対象外）、
 * 「ヒューマンに表示する可能性があるが辞書未登録」を CI で発見可能にする目的。
 *
 * 利用: `node scripts/check-audit-labels.mjs`（exit 1 で失敗）
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SCHEMA_PATH = join(ROOT, 'backend/prisma/schema.prisma')
const DICT_PATH = join(ROOT, 'frontend/src/shared/audit-labels/index.ts')

// 辞書未登録でも問題ない技術フィールド（自動採番/関係性/タイムスタンプ）
const IGNORED_FIELDS = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'parentId',
    'createdBy',
    'depth',
    'stripeAccountId',
    // リレーション末端
    'memberships',
    'announcements',
    'parent',
    'children',
    'activities',
    'chatChannel',
    'albums',
    'joinRequests',
    'polls',
    'webhookConfigs',
    'expenses',
    'expenseCategories',
    'connect',
    'bookmarks',
])

function extractCommunityFields() {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8')
    const m = schema.match(/model\s+Community\s*\{([\s\S]*?)\}/)
    if (!m) {
        console.error('[check-audit-labels] Community model not found in schema.prisma')
        process.exit(2)
    }
    const body = m[1]
    const fields = []
    for (const rawLine of body.split('\n')) {
        const line = rawLine.trim()
        if (!line || line.startsWith('//') || line.startsWith('@@')) continue
        const [name] = line.split(/\s+/)
        if (!name || /^[A-Z]/.test(name)) continue
        fields.push(name)
    }
    return fields
}

function extractDictKeys() {
    const src = readFileSync(DICT_PATH, 'utf-8')
    const m = src.match(/AUDIT_FIELD_LABELS[^=]*=\s*\{([\s\S]*?)\}\s*\n/)
    if (!m) {
        console.error('[check-audit-labels] AUDIT_FIELD_LABELS not found in audit-labels/index.ts')
        process.exit(2)
    }
    const body = m[1]
    const keys = []
    for (const rawLine of body.split('\n')) {
        const line = rawLine.trim()
        if (!line || line.startsWith('//')) continue
        const km = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/)
        if (km) keys.push(km[1])
    }
    return keys
}

const schemaFields = extractCommunityFields()
const dictKeys = new Set(extractDictKeys())

const missing = schemaFields.filter(f => !IGNORED_FIELDS.has(f) && !dictKeys.has(f))

if (missing.length === 0) {
    console.log('[check-audit-labels] OK: all Community fields are present in audit dictionary.')
    process.exit(0)
}

console.error('[check-audit-labels] WARN: Community fields without audit label:')
for (const f of missing) console.error(`  - ${f}`)
console.error(
    '\nUpdate frontend/src/shared/audit-labels/index.ts AUDIT_FIELD_LABELS or add the field to IGNORED_FIELDS in this script.',
)
process.exit(1)
