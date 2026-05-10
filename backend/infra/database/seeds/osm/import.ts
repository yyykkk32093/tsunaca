/**
 * places.jsonl を Prisma 経由で Place テーブルに upsert
 *
 * - upsertキー: (source, sourceId)
 * - usageCount は upsert の update では上書きしない（既存値保持）
 * - 当回スナップショットに含まれない既存Placeは isActive=false に降格
 *
 * 環境変数: DATABASE_URL（必須）
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { SOURCE } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const IN_JSONL = path.join(DATA_DIR, 'places.jsonl')

const BATCH_SIZE = 500

type PlaceRecord = {
    sourceId: string
    name: string
    address: string
    lat: number
    lng: number
    normalizedName: string
    normalizedAddress: string
    category: string
}

async function main(): Promise<void> {
    if (!fs.existsSync(IN_JSONL)) {
        throw new Error(`Input not found: ${IN_JSONL}. Run "pnpm osm:transform" first.`)
    }

    const prisma = new PrismaClient()
    try {
        const rl = readline.createInterface({
            input: fs.createReadStream(IN_JSONL, { encoding: 'utf-8' }),
            crlfDelay: Infinity,
        })

        const seenSourceIds = new Set<string>()
        let batch: PlaceRecord[] = []
        let totalUpserted = 0

        for await (const line of rl) {
            if (!line.trim()) continue
            const rec = JSON.parse(line) as PlaceRecord
            seenSourceIds.add(rec.sourceId)
            batch.push(rec)
            if (batch.length >= BATCH_SIZE) {
                await flushBatch(prisma, batch)
                totalUpserted += batch.length
                console.log(`[import] upserted=${totalUpserted}`)
                batch = []
            }
        }
        if (batch.length > 0) {
            await flushBatch(prisma, batch)
            totalUpserted += batch.length
        }

        console.log(`[import] total upserted: ${totalUpserted}`)

        // 当回に含まれなかった既存Placeを論理削除（isActive=false）
        // - 1回限りの初期投入時はほぼ何もヒットしない
        // - 月次最新化ジョブでは閉鎖店舗の降格に効く
        const sourceIds = Array.from(seenSourceIds)
        const deactivatedCount = await prisma.$executeRawUnsafe<number>(
            `
            UPDATE "Place"
            SET "isActive" = false
            WHERE "source" = $1
              AND "isActive" = true
              AND NOT ("sourceId" = ANY($2::text[]))
            `,
            SOURCE,
            sourceIds,
        )
        console.log(`[import] deactivated (not in current snapshot): ${deactivatedCount}`)
    } finally {
        await prisma.$disconnect()
    }
}

async function flushBatch(prisma: PrismaClient, batch: PlaceRecord[]): Promise<void> {
    // 並列度を抑えた upsert（バルクupsertはPrisma未対応）
    await Promise.all(
        batch.map((rec) =>
            prisma.place.upsert({
                where: {
                    source_sourceId: { source: SOURCE, sourceId: rec.sourceId },
                },
                create: {
                    name: rec.name,
                    address: rec.address,
                    lat: rec.lat,
                    lng: rec.lng,
                    normalizedName: rec.normalizedName,
                    normalizedAddress: rec.normalizedAddress,
                    category: rec.category,
                    source: SOURCE,
                    sourceId: rec.sourceId,
                    isActive: true,
                },
                update: {
                    name: rec.name,
                    address: rec.address,
                    lat: rec.lat,
                    lng: rec.lng,
                    normalizedName: rec.normalizedName,
                    normalizedAddress: rec.normalizedAddress,
                    category: rec.category,
                    isActive: true,
                    // usageCount は更新しない（既存値保持）
                },
            }),
        ),
    )
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
