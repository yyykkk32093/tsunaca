/**
 * RecurringScheduleGenerator — 繰り返しスケジュール生成ドメインサービス
 *
 * Activity の recurrenceRule（RFC 5545 RRULE 文字列）から、
 * 今日〜1年後までの Schedule エンティティ配列を生成する。
 *
 * 純粋ロジック: リポジトリへの永続化は呼び出し元（UseCase）が行う。
 */
import type { IIdGenerator } from '@/domains/_sharedDomains/domain/service/IIdGenerator.js'
import type { Activity } from '@/domains/activity/domain/model/entity/Activity.js'
import { RecurrenceRule } from '@/domains/activity/domain/model/valueObject/RecurrenceRule.js'
import { TimeOfDay } from '@/domains/activity/domain/model/valueObject/TimeOfDay.js'
import { Schedule } from '../model/entity/Schedule.js'
import { ScheduleId } from '../model/valueObject/ScheduleId.js'

/** 生成上限（DAILY × 365 を想定） */
const MAX_SCHEDULES = 365

/** デフォルト生成期間: 今日から2ヶ月後 */
const DEFAULT_GENERATION_DAYS = 60

/** 最大生成期間: 1年 */
const MAX_GENERATION_DAYS = 365

export class RecurringScheduleGenerator {
    /**
     * Activity の recurrenceRule に基づき、未存在の日付に対して新規 Schedule を生成する。
     *
     * @param activity        recurrenceRule を持つ Activity
     * @param existingDates   既存 Schedule の日付文字列（YYYY-MM-DD）の Set
     * @param idGenerator     ID 生成器
     * @param generationMonths 生成期間（月数）。デフォルト2、最大12
     * @returns               新規 Schedule エンティティ配列（最大 365 件）
     */
    static generateSchedules(
        activity: Activity,
        existingDates: Set<string>,
        idGenerator: IIdGenerator,
        generationMonths?: number,
    ): Schedule[] {
        const ruleString = activity.getRecurrenceRule()
        if (!ruleString) return []

        const days = RecurringScheduleGenerator.resolveGenerationDays(generationMonths)
        const rule = RecurrenceRule.reconstruct(ruleString)
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)

        const dates = rule.between(from, to)
        const newSchedules: Schedule[] = []

        for (const date of dates) {
            if (newSchedules.length >= MAX_SCHEDULES) break

            const dateKey = date.toISOString().slice(0, 10)
            if (existingDates.has(dateKey)) continue

            const schedule = Schedule.create({
                id: ScheduleId.create(idGenerator.generate()),
                activityId: activity.getId(),
                date,
                startTime: activity.getDefaultStartTime() ?? TimeOfDay.create('09:00'),
                endTime: activity.getDefaultEndTime() ?? TimeOfDay.create('10:00'),
                location: activity.getDefaultLocationCustom() ?? null,
                ...(activity.getDefaultParticipationFee() != null && {
                    participationFee: activity.getDefaultParticipationFee(),
                }),
                ...(activity.getDefaultVisitorFee() != null && {
                    visitorFee: activity.getDefaultVisitorFee(),
                }),
                ...(activity.getDefaultCapacity() != null && {
                    capacity: activity.getDefaultCapacity(),
                }),
            })
            newSchedules.push(schedule)
        }

        return newSchedules
    }

    /**
     * 新しい recurrenceRule に合致しない「未来の」既存スケジュールを特定する。
     * recurrenceRule 変更時の削除対象判定に使用。
     *
     * @param newRuleString       新しい RRULE 文字列（null の場合は全未来スケジュールが対象）
     * @param existingSchedules   既存の Schedule エンティティ配列
     * @param generationMonths    生成期間（月数）。デフォルト2、最大12
     * @returns                   新ルールに合致しない未来のスケジュール配列
     */
    static findSchedulesToRemove(
        newRuleString: string | null,
        existingSchedules: Schedule[],
        generationMonths?: number,
    ): Schedule[] {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // 過去のスケジュールは対象外（履歴保持）
        const futureSchedules = existingSchedules.filter(
            (s) => s.getDate() >= today && !s.isCancelled(),
        )

        // recurrenceRule が null になった → 全未来スケジュールが削除対象
        if (!newRuleString) return futureSchedules

        // 新ルールで指定期間分の日付を展開
        const days = RecurringScheduleGenerator.resolveGenerationDays(generationMonths)
        const rule = RecurrenceRule.reconstruct(newRuleString)
        const to = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
        const newDates = rule.between(today, to)
        const newDateSet = new Set(newDates.map((d) => d.toISOString().slice(0, 10)))

        // 新ルールに合致しない未来スケジュールが削除対象
        return futureSchedules.filter(
            (s) => !newDateSet.has(s.getDate().toISOString().slice(0, 10)),
        )
    }

    /**
     * 月数を日数に変換する（1ヶ月=30日概算）。
     * デフォルト: 2ヶ月(60日)、最大: 12ヶ月(365日)
     */
    private static resolveGenerationDays(months?: number): number {
        if (months == null) return DEFAULT_GENERATION_DAYS
        const clamped = Math.max(1, Math.min(12, months))
        const days = clamped * 30
        return Math.min(days, MAX_GENERATION_DAYS)
    }
}
