/**
 * Wave6 Phase 8-B: Google reCAPTCHA v3 トークン検証。
 *
 * 環境変数:
 *   - RECAPTCHA_SECRET : 設定がなければ常に true を返す（ローカル開発用 no-op）
 *   - RECAPTCHA_MIN_SCORE : 合格スコア下限（デフォルト 0.5）
 */
export async function verifyRecaptchaToken(
    token: string,
    remoteIp?: string,
): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET
    if (!secret) {
        console.info('[inquiry] reCAPTCHA 検証 (NO-OP / RECAPTCHA_SECRET 未設定)')
        return true
    }
    const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5')

    const params = new URLSearchParams({ secret, response: token })
    if (remoteIp) params.set('remoteip', remoteIp)

    try {
        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        })
        if (!res.ok) return false
        const data = (await res.json()) as { success: boolean; score?: number }
        if (!data.success) return false
        if (typeof data.score === 'number' && data.score < minScore) return false
        return true
    } catch (err) {
        console.warn('[inquiry] reCAPTCHA 検証エラー:', err)
        return false
    }
}
