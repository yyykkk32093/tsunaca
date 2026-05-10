/**
 * RevenueCat Webhook コントローラ
 *
 * POST /v1/webhooks/revenuecat
 *
 * RevenueCat 側で設定した Authorization トークンで認証する。
 */

import { usecaseFactory } from '@/api/_usecaseFactory.js'
import type { NextFunction, Request, Response } from 'express'

export const revenueCatWebhookController = {
    async handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            // Authorization ヘッダー検証
            const { RevenueCatBillingService } = await import(
                '@/integration/billing/RevenueCatBillingService.js'
            )
            const { StripeServiceImpl } = await import(
                '@/integration/stripe/StripeServiceImpl.js'
            )
            const billingService = new RevenueCatBillingService(new StripeServiceImpl())

            const authHeader = req.headers.authorization ?? ''
            if (!billingService.verifyWebhookAuth(authHeader)) {
                res.status(401).json({ error: 'Unauthorized' })
                return
            }

            const useCase = usecaseFactory.createHandleRevenueCatWebhookUseCase()
            await useCase.execute({ payload: req.body })

            res.status(200).json({ received: true })
        } catch (err) {
            next(err)
        }
    },
}
