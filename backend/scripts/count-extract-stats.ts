/**
 * extract.jsonl を集計してname必須/address必須でどれだけ件数が変わるかを計測
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

const IN = path.join('infra/database/seeds/osm/data/extracted.jsonl')

async function main() {
    let total = 0
    let withName = 0
    let withAddress = 0
    let withBoth = 0
    let withNameNoLoc = 0
    let withNameWithLoc = 0
    const dedupName = new Set<string>()
    const dedupBoth = new Set<string>()
    const dedupAll = new Set<string>()

    const rl = readline.createInterface({
        input: fs.createReadStream(IN, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    })

    for await (const line of rl) {
        if (!line.trim()) continue
        let f: any
        try { f = JSON.parse(line) } catch { continue }
        total++
        const props = f.properties ?? {}
        const name: string | undefined = props['name:ja'] ?? props['name']
        const addrParts = [props['addr:province'], props['addr:city'], props['addr:district'], props['addr:quarter'], props['addr:neighbourhood'], props['addr:block_number'], props['addr:housenumber']].filter(Boolean) as string[]
        const addr: string | undefined = props['addr:full'] ?? (addrParts.length > 0 ? addrParts.join('') : undefined)

        let lat: number | null = null
        let lng: number | null = null
        if (f.geometry?.type === 'Point') {
            ;[lng, lat] = f.geometry.coordinates
        } else if (f.geometry?.type === 'Polygon') {
            const r = f.geometry.coordinates[0]
            if (r?.length) { [lng, lat] = r[0] }
        } else if (f.geometry?.type === 'MultiPolygon') {
            const r = f.geometry.coordinates[0]?.[0]
            if (r?.length) { [lng, lat] = r[0] }
        } else if (f.geometry?.type === 'LineString') {
            const r = f.geometry.coordinates
            if (r?.length) { [lng, lat] = r[0] }
        }
        const locKey = lat && lng ? `${lat.toFixed(4)},${lng.toFixed(4)}` : 'noloc'
        const allKey = `${name ?? '(noname)'}|${locKey}`
        dedupAll.add(allKey)

        if (name) {
            withName++
            if (lat == null || lng == null) withNameNoLoc++
            else withNameWithLoc++
            dedupName.add(`${name}|${locKey}`)
            if (addr) {
                withAddress++
                withBoth++
                dedupBoth.add(`${name}|${locKey}`)
            }
        } else if (addr) {
            withAddress++
        }
    }

    console.log('=== 抽出済み extracted.jsonl の統計 ===')
    console.log('total features:', total)
    console.log('with name:', withName)
    console.log('  └─ with lat/lng:', withNameWithLoc)
    console.log('  └─ no lat/lng:  ', withNameNoLoc)
    console.log('with address:', withAddress)
    console.log('with name+address:', withBoth)
    console.log('---')
    console.log('name のみ必須・lat/lng丸めdedup後（推定投入件数 解釈A）:', dedupName.size)
    console.log('name+address 必須・dedup後（現状投入件数想定）:', dedupBoth.size)
    console.log('全 features dedup（参考）:', dedupAll.size)
}

main().catch((e) => { console.error(e); process.exit(1) })
