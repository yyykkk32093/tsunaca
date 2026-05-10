import { DomainValidationError } from '@/domains/_sharedDomains/error/DomainValidationError.js'
import { AggregateRoot } from '@/domains/_sharedDomains/model/entity/AggregateRoot.js'
import { Fee } from '@/domains/_sharedDomains/model/valueObject/Fee.js'
import { UserId } from '@/domains/_sharedDomains/model/valueObject/UserId.js'
import { CommunityId } from '@/domains/community/domain/model/valueObject/CommunityId.js'
import { ActivityDescription } from '../valueObject/ActivityDescription.js'
import { ActivityId } from '../valueObject/ActivityId.js'
import { ActivityTitle } from '../valueObject/ActivityTitle.js'
import { ActivityVisibility } from '../valueObject/ActivityVisibility.js'
import { TimeOfDay } from '../valueObject/TimeOfDay.js'

/**
 * Activity: 「何をするか」＋「繰り返しパターン（あれば）」
 * - statusなし（論理削除: deletedAt）
 * - communityId で Community に紐づく
 * - Schedule の元となるデフォルト設定を持つ
 *
 * 開催場所モデル (W6-07):
 *  - defaultPlaceId: Place マスタへの参照（OSM由来。選択時のみ）
 *  - defaultLocationCustom: 自由入力の場所名（マスタに無い場所を許容）
 *  - isOnline: オンライン開催フラグ
 *  - 3つは独立。すべて null/false 可、複数同時設定も許可（フロント側で表示優先度を制御）
 */
export class Activity extends AggregateRoot {
    private constructor(
        private readonly id: ActivityId,
        private readonly communityId: CommunityId,
        private title: ActivityTitle,
        private description: ActivityDescription | null,
        private defaultPlaceId: string | null,
        private defaultLocationCustom: string | null,
        private isOnline: boolean,
        private defaultStartTime: TimeOfDay | null,
        private defaultEndTime: TimeOfDay | null,
        private defaultParticipationFee: Fee | null,
        private defaultVisitorFee: Fee | null,
        private defaultCapacity: number | null,
        private allowVisitorWaitlist: boolean,
        private visibility: ActivityVisibility,
        private recurrenceRule: string | null,
        private organizerUserId: UserId | null,
        private readonly createdBy: UserId,
        private deletedAt: Date | null,
    ) {
        super()
    }

    static create(params: {
        id: ActivityId
        communityId: CommunityId
        title: ActivityTitle
        description?: ActivityDescription | null
        defaultPlaceId?: string | null
        defaultLocationCustom?: string | null
        isOnline?: boolean
        defaultStartTime?: TimeOfDay | null
        defaultEndTime?: TimeOfDay | null
        defaultParticipationFee?: Fee | null
        defaultVisitorFee?: Fee | null
        defaultCapacity?: number | null
        allowVisitorWaitlist?: boolean
        visibility?: ActivityVisibility
        recurrenceRule?: string | null
        organizerUserId?: UserId | null
        createdBy: UserId
    }): Activity {
        if (params.defaultStartTime && params.defaultEndTime) {
            if (!params.defaultStartTime.isBefore(params.defaultEndTime)) {
                throw new DomainValidationError(
                    'デフォルト開始時刻はデフォルト終了時刻より前にしてください',
                    'INVALID_DEFAULT_TIME_RANGE'
                )
            }
        }

        return new Activity(
            params.id,
            params.communityId,
            params.title,
            params.description ?? null,
            params.defaultPlaceId ?? null,
            params.defaultLocationCustom ?? null,
            params.isOnline ?? false,
            params.defaultStartTime ?? null,
            params.defaultEndTime ?? null,
            params.defaultParticipationFee ?? null,
            params.defaultVisitorFee ?? null,
            params.defaultCapacity ?? null,
            params.allowVisitorWaitlist ?? false,
            params.visibility ?? ActivityVisibility.private(),
            params.recurrenceRule ?? null,
            params.organizerUserId ?? null,
            params.createdBy,
            null,
        )
    }

    static reconstruct(params: {
        id: ActivityId
        communityId: CommunityId
        title: ActivityTitle
        description: ActivityDescription | null
        defaultPlaceId: string | null
        defaultLocationCustom: string | null
        isOnline: boolean
        defaultStartTime: TimeOfDay | null
        defaultEndTime: TimeOfDay | null
        defaultParticipationFee: Fee | null
        defaultVisitorFee: Fee | null
        defaultCapacity: number | null
        allowVisitorWaitlist: boolean
        visibility: ActivityVisibility
        recurrenceRule: string | null
        organizerUserId: UserId | null
        createdBy: UserId
        deletedAt: Date | null
    }): Activity {
        return new Activity(
            params.id,
            params.communityId,
            params.title,
            params.description,
            params.defaultPlaceId,
            params.defaultLocationCustom,
            params.isOnline,
            params.defaultStartTime,
            params.defaultEndTime,
            params.defaultParticipationFee,
            params.defaultVisitorFee,
            params.defaultCapacity,
            params.allowVisitorWaitlist,
            params.visibility,
            params.recurrenceRule,
            params.organizerUserId,
            params.createdBy,
            params.deletedAt,
        )
    }

    // ---- Behavior ----

    update(params: {
        title?: ActivityTitle
        description?: ActivityDescription | null
        defaultPlaceId?: string | null
        defaultLocationCustom?: string | null
        isOnline?: boolean
        defaultStartTime?: TimeOfDay | null
        defaultEndTime?: TimeOfDay | null
        defaultParticipationFee?: Fee | null
        defaultVisitorFee?: Fee | null
        defaultCapacity?: number | null
        allowVisitorWaitlist?: boolean
        visibility?: ActivityVisibility
        recurrenceRule?: string | null
        organizerUserId?: UserId | null
    }): void {
        if (this.isDeleted()) {
            throw new DomainValidationError('削除済みアクティビティは更新できません', 'ACTIVITY_ALREADY_DELETED')
        }
        if (params.title) this.title = params.title
        if (params.description !== undefined) this.description = params.description
        if (params.defaultPlaceId !== undefined) this.defaultPlaceId = params.defaultPlaceId
        if (params.defaultLocationCustom !== undefined) this.defaultLocationCustom = params.defaultLocationCustom
        if (params.isOnline !== undefined) this.isOnline = params.isOnline
        if (params.defaultStartTime !== undefined) this.defaultStartTime = params.defaultStartTime
        if (params.defaultEndTime !== undefined) this.defaultEndTime = params.defaultEndTime
        if (params.defaultParticipationFee !== undefined) this.defaultParticipationFee = params.defaultParticipationFee
        if (params.defaultVisitorFee !== undefined) this.defaultVisitorFee = params.defaultVisitorFee
        if (params.defaultCapacity !== undefined) this.defaultCapacity = params.defaultCapacity
        if (params.allowVisitorWaitlist !== undefined) this.allowVisitorWaitlist = params.allowVisitorWaitlist
        if (params.visibility !== undefined) this.visibility = params.visibility
        if (params.recurrenceRule !== undefined) this.recurrenceRule = params.recurrenceRule
        if (params.organizerUserId !== undefined) this.organizerUserId = params.organizerUserId

        if (this.defaultStartTime && this.defaultEndTime) {
            if (!this.defaultStartTime.isBefore(this.defaultEndTime)) {
                throw new DomainValidationError(
                    'デフォルト開始時刻はデフォルト終了時刻より前にしてください',
                    'INVALID_DEFAULT_TIME_RANGE'
                )
            }
        }
    }

    softDelete(): void {
        if (this.isDeleted()) {
            throw new DomainValidationError('すでに削除済みです', 'ACTIVITY_ALREADY_DELETED')
        }
        this.deletedAt = new Date()
    }

    changeOrganizer(userId: UserId | null): void {
        if (this.isDeleted()) {
            throw new DomainValidationError('削除済みアクティビティは更新できません', 'ACTIVITY_ALREADY_DELETED')
        }
        this.organizerUserId = userId
    }

    // ---- Query ----

    isDeleted(): boolean {
        return this.deletedAt !== null
    }

    getId(): ActivityId { return this.id }
    getCommunityId(): CommunityId { return this.communityId }
    getTitle(): ActivityTitle { return this.title }
    getDescription(): ActivityDescription | null { return this.description }
    getDefaultPlaceId(): string | null { return this.defaultPlaceId }
    getDefaultLocationCustom(): string | null { return this.defaultLocationCustom }
    getIsOnline(): boolean { return this.isOnline }
    getDefaultStartTime(): TimeOfDay | null { return this.defaultStartTime }
    getDefaultEndTime(): TimeOfDay | null { return this.defaultEndTime }
    getDefaultParticipationFee(): Fee | null { return this.defaultParticipationFee }
    getDefaultVisitorFee(): Fee | null { return this.defaultVisitorFee }
    getDefaultCapacity(): number | null { return this.defaultCapacity }
    getAllowVisitorWaitlist(): boolean { return this.allowVisitorWaitlist }
    getVisibility(): ActivityVisibility { return this.visibility }
    getRecurrenceRule(): string | null { return this.recurrenceRule }
    getOrganizerUserId(): UserId | null { return this.organizerUserId }
    getCreatedBy(): UserId { return this.createdBy }
    getDeletedAt(): Date | null { return this.deletedAt }
}
