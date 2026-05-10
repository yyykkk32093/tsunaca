import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'
import { ValueObject } from '@/domains/_sharedDomains/model/valueObject/ValueObject.js'

export class PlaceName extends ValueObject<string> {
    private static readonly MAX_LENGTH = 200

    private constructor(value: string) {
        super(value)
    }

    static create(value: string): PlaceName {
        const trimmed = value?.trim()
        if (!trimmed || trimmed.length === 0) {
            throw new DomainValidationError('場所名は必須です', 'INVALID_PLACE_NAME')
        }
        if (trimmed.length > PlaceName.MAX_LENGTH) {
            throw new DomainValidationError(
                `場所名は${PlaceName.MAX_LENGTH}文字以内で入力してください`,
                'INVALID_PLACE_NAME'
            )
        }
        return new PlaceName(trimmed)
    }

    static reconstruct(value: string): PlaceName {
        return new PlaceName(value)
    }
}
