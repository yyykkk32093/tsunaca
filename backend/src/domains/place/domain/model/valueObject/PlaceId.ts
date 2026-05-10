import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'
import { ValueObject } from '@/domains/_sharedDomains/model/valueObject/ValueObject.js'

export class PlaceId extends ValueObject<string> {
    private constructor(value: string) {
        super(value)
    }

    static create(value: string): PlaceId {
        if (!value || value.trim().length === 0) {
            throw new DomainValidationError('PlaceId は空にできません', 'INVALID_PLACE_ID')
        }
        return new PlaceId(value)
    }

    static reconstruct(value: string): PlaceId {
        return new PlaceId(value)
    }
}
