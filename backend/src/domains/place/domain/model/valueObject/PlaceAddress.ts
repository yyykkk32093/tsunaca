import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'
import { ValueObject } from '@/domains/_sharedDomains/model/valueObject/ValueObject.js'

export class PlaceAddress extends ValueObject<string> {
    private static readonly MAX_LENGTH = 500

    private constructor(value: string) {
        super(value)
    }

    static create(value: string): PlaceAddress {
        const trimmed = value?.trim()
        if (!trimmed || trimmed.length === 0) {
            throw new DomainValidationError('住所は必須です', 'INVALID_PLACE_ADDRESS')
        }
        if (trimmed.length > PlaceAddress.MAX_LENGTH) {
            throw new DomainValidationError(
                `住所は${PlaceAddress.MAX_LENGTH}文字以内で入力してください`,
                'INVALID_PLACE_ADDRESS'
            )
        }
        return new PlaceAddress(trimmed)
    }

    static reconstruct(value: string): PlaceAddress {
        return new PlaceAddress(value)
    }
}
