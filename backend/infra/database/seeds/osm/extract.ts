/**
 * OSM PBF から対象タグの POI を抽出
 *
 * 1) osmium tags-filter で raw PBF をフィルタ
 * 2) osmium export で GeoJSON に変換
 * 3) GeoJSON Feature を JSONL に変換（後続 transform.ts が読みやすい形）
 *
 * 出力: ./data/extracted.jsonl
 */

import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { EXTRACT_TAGS } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const SRC_PBF = path.join(DATA_DIR, 'japan-latest.osm.pbf')
const FILTERED_PBF = path.join(DATA_DIR, 'filtered.osm.pbf')
const GEOJSON_SEQ = path.join(DATA_DIR, 'extracted.geojsonseq')
const OUT_JSONL = path.join(DATA_DIR, 'extracted.jsonl')

function run(cmd: string, args: string[]): void {
    console.log(`[extract] $ ${cmd} ${args.join(' ')}`)
    const r = spawnSync(cmd, args, { stdio: 'inherit' })
    if (r.status !== 0) {
        throw new Error(`Command failed: ${cmd} (exit ${r.status})`)
    }
}

async function geojsonseqToJsonl(): Promise<void> {
    const out = fs.createWriteStream(OUT_JSONL, { encoding: 'utf-8' })
    const rl = readline.createInterface({
        input: fs.createReadStream(GEOJSON_SEQ, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    })
    let count = 0
    for await (const raw of rl) {
        // GeoJSON Sequence は RS(0x1e) で始まる場合があるので除去
        const line = raw.replace(/^\u001e/, '').trim()
        if (!line) continue
        try {
            const feature = JSON.parse(line)
            if (feature?.type !== 'Feature') continue
            out.write(JSON.stringify(feature) + '\n')
            count++
        } catch {
            // 壊れた行はスキップ
        }
    }
    out.end()
    console.log(`[extract] wrote ${count} features → ${OUT_JSONL}`)
}

async function main(): Promise<void> {
    if (!fs.existsSync(SRC_PBF)) {
        throw new Error(`Source PBF not found: ${SRC_PBF}. Run "pnpm osm:download" first.`)
    }

    // 1) tags-filter
    run('osmium', ['tags-filter', SRC_PBF, ...EXTRACT_TAGS, '-o', FILTERED_PBF, '--overwrite'])

    // 2) export to GeoJSON Sequence
    // --add-unique-id=type_id により feature.id を n123 / w456 / r789 形式で出力する。
    // transform.ts はこの id から sourceId を生成するため必須。
    run('osmium', [
        'export',
        FILTERED_PBF,
        '-f',
        'geojsonseq',
        '--add-unique-id=type_id',
        '-o',
        GEOJSON_SEQ,
        '--overwrite',
    ])

    // 3) GeoJSON Sequence → JSONL
    await geojsonseqToJsonl()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
