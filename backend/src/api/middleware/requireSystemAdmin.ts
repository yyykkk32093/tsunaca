import { prisma } from '@/_sharedTech/db/client.js'
import type { NextFunction, Request, Response } from 'express'

/**
 * Wave6 Phase 8-A: プラットフォーム運営権限を要求する認可ミドルウェア。
 *
 * 必ず authMiddleware の後段に配置すること。
 * テナント内権限（CommunityMembership.role）とは別概念であることに注意。
 *
 * - JWT には systemRole を入れていないため、毎回 DB から最新値を引く（ロール変更の即時反映）。
 * - 未認可は 404 を返す（管理画面の存在自体を秘匿し、列挙攻撃を防ぐ）。
 *
 * @param allowedRoles 許可するロール。省略時は OPERATOR と SUPER_ADMIN を許可。
 */
export function requireSystemAdmin(
    ...allowedRoles: Array<'OPERATOR' | 'SUPER_ADMIN'>
) {
    const roles =
        allowedRoles.length > 0 ? allowedRoles : (['OPERATOR', 'SUPER_ADMIN'] as const)

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = req.user?.userId
        if (!userId) {
            res.status(401).json({ code: 'UNAUTHORIZED', message: '認証が必要です' })
            return
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { systemRole: true, deletedAt: true },
        })

        if (!user || user.deletedAt) {
            res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
            return
        }

        if (!(roles as readonly string[]).includes(user.systemRole)) {
            // 列挙防止のため 404 を返す
            res.status(404).json({ code: 'NOT_FOUND', message: 'Not Found' })
            return
        }

        req.user!.systemRole = user.systemRole
        next()
    }
}
