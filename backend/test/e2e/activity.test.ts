// test/e2e/activity.test.ts

import { prisma } from '@/_sharedTech/db/client.js'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanAllTables } from './helpers/dbCleanup.js'
import { createTestUserDirect } from './helpers/seedUser.js'
import { bearerToken } from './helpers/testAuth.js'
import app from './serverForTest.js'

const describeE2E = process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip

describeE2E('Activity E2E', () => {
    const ownerId = 'e2e-act-owner-001'
    const ownerEmail = 'act-owner@test.com'
    const memberId = 'e2e-act-member-001'
    const memberEmail = 'act-member@test.com'
    const outsiderId = 'e2e-act-outsider-001'
    const outsiderEmail = 'outsider@test.com'

    let communityId: string

    beforeEach(async () => {
        await cleanAllTables()

        await createTestUserDirect({ id: ownerId, email: ownerEmail, plan: 'SUBSCRIBER' })
        await createTestUserDirect({ id: memberId, email: memberEmail, plan: 'FREE' })
        await createTestUserDirect({ id: outsiderId, email: outsiderEmail, plan: 'FREE' })

        // コミュニティ作成
        const createRes = await request(app)
            .post('/v1/communities')
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ name: 'Activityテスト用' })
        communityId = createRes.body.communityId

        // member を追加
        await request(app)
            .post(`/v1/communities/${communityId}/members`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ userId: memberId })

        // Outbox/Audit クリア
        await prisma.outboxEvent.deleteMany({})
        await prisma.authAuditLog.deleteMany({})
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    // ========================================
    // Activity CRUD
    // ========================================

    it('POST /v1/communities/:communityId/activities → Activity作成（OWNER）', async () => {
        const res = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({
                title: 'バドミントン練習',
                description: '毎週の練習',
                defaultLocationCustom: '○○体育館',
                defaultStartTime: '10:00',
                defaultEndTime: '12:00',
            })

        expect(res.status).toBe(201)
        expect(res.body.activityId).toBeDefined()

        // DB確認
        const activity = await prisma.activity.findUnique({
            where: { id: res.body.activityId },
        })
        expect(activity).not.toBeNull()
        expect(activity!.title).toBe('バドミントン練習')
        expect(activity!.communityId).toBe(communityId)
        expect(activity!.defaultLocationCustom).toBe('○○体育館')
        expect(activity!.defaultStartTime).toBe('10:00')
        expect(activity!.defaultEndTime).toBe('12:00')
        expect(activity!.deletedAt).toBeNull()
    })

    it('GET /v1/communities/:communityId/activities → Activity一覧', async () => {
        // 2つ作成
        await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: 'Activity A' })
        await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: 'Activity B' })

        const listRes = await request(app)
            .get(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))

        expect(listRes.status).toBe(200)
        expect(Array.isArray(listRes.body.activities)).toBe(true)
        expect(listRes.body.activities.length).toBe(2)
    })

    it('GET /v1/activities/:id → Activity詳細', async () => {
        const createRes = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: '詳細テスト', description: '説明' })

        const findRes = await request(app)
            .get(`/v1/activities/${createRes.body.activityId}`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))

        expect(findRes.status).toBe(200)
        expect(findRes.body.title).toBe('詳細テスト')
    })

    it('PATCH /v1/activities/:id → Activity更新（OWNERのみ）', async () => {
        const createRes = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: '更新前' })

        const updateRes = await request(app)
            .patch(`/v1/activities/${createRes.body.activityId}`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: '更新後', defaultLocationCustom: '△△公園' })

        expect(updateRes.status).toBe(204)

        const after = await prisma.activity.findUnique({
            where: { id: createRes.body.activityId },
        })
        expect(after!.title).toBe('更新後')
        expect(after!.defaultLocationCustom).toBe('△△公園')
    })

    it('DELETE /v1/activities/:id → Activity論理削除', async () => {
        const createRes = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: '削除対象' })

        const deleteRes = await request(app)
            .delete(`/v1/activities/${createRes.body.activityId}`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))

        expect(deleteRes.status).toBe(204)

        const after = await prisma.activity.findUnique({
            where: { id: createRes.body.activityId },
        })
        expect(after!.deletedAt).not.toBeNull()
    })

    // ========================================
    // 権限チェック
    // ========================================

    it('一般メンバーはActivity作成不可 → 403', async () => {
        const res = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(memberId, memberEmail))
            .send({ title: 'メンバー試行' })

        expect(res.status).toBe(403)
    })

    it('一般メンバーはActivity更新不可 → 403', async () => {
        const createRes = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .set('Authorization', bearerToken(ownerId, ownerEmail))
            .send({ title: 'テスト' })

        const updateRes = await request(app)
            .patch(`/v1/activities/${createRes.body.activityId}`)
            .set('Authorization', bearerToken(memberId, memberEmail))
            .send({ title: '不正更新' })

        expect(updateRes.status).toBe(403)
    })

    it('認証なし → 401', async () => {
        const res = await request(app)
            .post(`/v1/communities/${communityId}/activities`)
            .send({ title: '認証なし' })

        expect(res.status).toBe(401)
    })
})
