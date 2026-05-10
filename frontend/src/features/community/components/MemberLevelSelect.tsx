import { useUpdateMemberLevel } from '@/features/community/hooks/useCommunitySettingsQueries'
import { useParticipationLevelLabels } from '@/features/master/hooks/useParticipationLevels'
import { Button } from '@/shared/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { useState } from 'react'
import { toast } from 'sonner'

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
const NULL_VALUE = '__NULL__'

/**
 * メンバーのコミュニティ内レベルを編集するセレクト + 確認ダイアログ。
 * プルダウンを変更したタイミングで確認ダイアログを表示する。
 */
export function MemberLevelSelect({
    communityId,
    userId,
    displayName,
    currentLevel,
    disabled,
}: {
    communityId: string
    userId: string
    displayName: string | null
    currentLevel: number | null
    disabled?: boolean
}) {
    const labels = useParticipationLevelLabels()
    const updateLevel = useUpdateMemberLevel(communityId)
    const [pendingLevel, setPendingLevel] = useState<number | null | undefined>(undefined)

    const fmt = (lv: number | null) =>
        lv == null ? '未設定' : `${labels[lv] ?? `Lv${lv}`} (Lv${lv})`

    const handleChange = (val: string) => {
        const next = val === NULL_VALUE ? null : Number(val)
        if (next === currentLevel) return
        setPendingLevel(next)
    }

    const handleConfirm = () => {
        if (pendingLevel === undefined) return
        updateLevel.mutate(
            { userId, level: pendingLevel },
            {
                onSuccess: () => {
                    toast.success('レベルを変更しました')
                    setPendingLevel(undefined)
                },
                onError: () => {
                    toast.error('レベル変更に失敗しました')
                    setPendingLevel(undefined)
                },
            },
        )
    }

    return (
        <>
            <Select
                value={currentLevel == null ? NULL_VALUE : String(currentLevel)}
                onValueChange={handleChange}
                disabled={disabled || updateLevel.isPending}
            >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NULL_VALUE}>未設定</SelectItem>
                    {LEVELS.map((lv) => (
                        <SelectItem key={lv} value={String(lv)}>
                            {fmt(lv)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog
                open={pendingLevel !== undefined}
                onOpenChange={(open) => { if (!open) setPendingLevel(undefined) }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>レベルを変更しますか？</DialogTitle>
                        <DialogDescription>
                            <span className="font-medium text-gray-800">
                                {displayName ?? userId.slice(0, 8)}
                            </span>
                            {' '}のレベルを<br />
                            <span className="text-gray-500">{fmt(currentLevel)}</span>
                            {' → '}
                            <span className="font-medium text-gray-800">
                                {pendingLevel === undefined ? '' : fmt(pendingLevel)}
                            </span>
                            {' '}に変更します。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPendingLevel(undefined)}
                            disabled={updateLevel.isPending}
                        >
                            キャンセル
                        </Button>
                        <Button onClick={handleConfirm} disabled={updateLevel.isPending}>
                            {updateLevel.isPending ? '変更中...' : '変更する'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
