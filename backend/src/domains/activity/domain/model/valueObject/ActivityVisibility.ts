import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'

/**
 * ActivityVisibility — アクティビティの公開範囲
 * - PUBLIC: コミュニティ非加入ユーザーも閲覧可能（将来的にビジター参加機能へ拡張）
 * - PRIVATE: コミュニティ会員のみ閲覧可能
 */
export type ActivityVisibilityValue = 'PUBLIC' | 'PRIVATE'

const VALID_VALUES: readonly ActivityVisibilityValue[] = ['PUBLIC', 'PRIVATE']

export class ActivityVisibility {
    private constructor(private readonly value: ActivityVisibilityValue) { }

    static create(value: string): ActivityVisibility {
        if (!VALID_VALUES.includes(value as ActivityVisibilityValue)) {
            throw new DomainValidationError(
                `公開範囲の値が不正です: ${value}`,
                'INVALID_ACTIVITY_VISIBILITY'
            )
        }
        return new ActivityVisibility(value as ActivityVisibilityValue)
    }

    static reconstruct(value: string): ActivityVisibility {
        return ActivityVisibility.create(value)
    }

    static public(): ActivityVisibility {
        return new ActivityVisibility('PUBLIC')
    }

    static private(): ActivityVisibility {
        return new ActivityVisibility('PRIVATE')
    }

    getValue(): ActivityVisibilityValue {
        return this.value
    }

    isPublic(): boolean {
        return this.value === 'PUBLIC'
    }

    isPrivate(): boolean {
        return this.value === 'PRIVATE'
    }

    equals(other: ActivityVisibility): boolean {
        return this.value === other.value
    }
}
