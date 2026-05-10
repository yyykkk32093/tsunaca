import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'
import { ValueObject } from '@/domains/_sharedDomains/model/valueObject/ValueObject.js'

export type UserPlanType = 'FREE' | 'LITE' | 'PRO' | 'LIFETIME'

const VALID_PLANS: readonly UserPlanType[] = ['FREE', 'LITE', 'PRO', 'LIFETIME'] as const

export class UserPlan extends ValueObject<UserPlanType> {
    private constructor(value: UserPlanType) {
        super(value)
    }

    static create(value?: string): UserPlan {
        const plan = (value ?? 'FREE').toUpperCase()

        if (!VALID_PLANS.includes(plan as UserPlanType)) {
            throw new DomainValidationError(
                `Invalid UserPlan: ${plan}`,
                'INVALID_USER_PLAN',
            )
        }
        return new UserPlan(plan as UserPlanType)
    }

    static reconstruct(value: string): UserPlan {
        return UserPlan.create(value)
    }

    isFree(): boolean {
        return this.getValue() === 'FREE'
    }

    isLite(): boolean {
        return this.getValue() === 'LITE'
    }

    isPro(): boolean {
        return this.getValue() === 'PRO'
    }

    isLifetime(): boolean {
        return this.getValue() === 'LIFETIME'
    }

    /** LITE/PRO/LIFETIME なら true（有料プラン判定） */
    isPaid(): boolean {
        return !this.isFree()
    }

    /** PRO または LIFETIME なら true（PREMIUM コミュニティグレード判定用） */
    isPremiumPlan(): boolean {
        return this.isPro() || this.isLifetime()
    }
}
