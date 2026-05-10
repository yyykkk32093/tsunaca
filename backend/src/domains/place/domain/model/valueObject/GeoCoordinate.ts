import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'

/**
 * 緯度経度の値オブジェクト（WGS84）
 * - 緯度: -90 〜 90
 * - 経度: -180 〜 180
 */
export class GeoCoordinate {
    private constructor(
        private readonly latitude: number,
        private readonly longitude: number,
    ) { }

    static create(lat: number, lng: number): GeoCoordinate {
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            throw new DomainValidationError('緯度の範囲が不正です', 'INVALID_GEO_COORDINATE')
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            throw new DomainValidationError('経度の範囲が不正です', 'INVALID_GEO_COORDINATE')
        }
        return new GeoCoordinate(lat, lng)
    }

    static reconstruct(lat: number, lng: number): GeoCoordinate {
        return new GeoCoordinate(lat, lng)
    }

    getLatitude(): number { return this.latitude }
    getLongitude(): number { return this.longitude }
}
