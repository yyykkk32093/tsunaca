import {
    CATEGORY_GROUPS,
    CATEGORY_GROUP_BY_ID,
    UNCATEGORIZED_GROUP_KEY,
} from '@/features/community/categoryGroups'
import { Button } from '@/shared/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import type { MasterItem } from '@/shared/types/api'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * 検索 + グループ折りたたみ付きカテゴリ選択コンポーネント。
 *
 * - トリガーボタン1行に常時収まる（縦に膨張しない）
 * - 開くと検索 input + グループ別 Accordion 表示
 * - キーワードで絞り込み中はマッチしたグループを自動展開
 */
export function CategoryPicker({
    categories,
    selectedId,
    onChange,
    placeholder = 'カテゴリを選択',
    disabled,
}: {
    categories: MasterItem[]
    selectedId: string
    onChange: (id: string) => void
    placeholder?: string
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

    // ダイアログを開いた時に選択中カテゴリのグループだけ展開
    useEffect(() => {
        if (!open) return
        const initial = new Set<string>()
        if (selectedId) {
            const g = CATEGORY_GROUP_BY_ID[selectedId] ?? UNCATEGORIZED_GROUP_KEY
            initial.add(g)
        }
        setOpenGroups(initial)
        setKeyword('')
    }, [open, selectedId])

    const selected = useMemo(
        () => categories.find((c) => c.id === selectedId) ?? null,
        [categories, selectedId],
    )

    // キーワードで絞り込み
    const normalizedKw = keyword.trim().toLowerCase()
    const filteredCategories = useMemo(() => {
        if (!normalizedKw) return categories
        return categories.filter((c) =>
            c.name.toLowerCase().includes(normalizedKw) ||
            c.nameEn.toLowerCase().includes(normalizedKw),
        )
    }, [categories, normalizedKw])

    // グループごとにバケット化
    const grouped = useMemo(() => {
        const map = new Map<string, MasterItem[]>()
        for (const c of filteredCategories) {
            const g = CATEGORY_GROUP_BY_ID[c.id] ?? UNCATEGORIZED_GROUP_KEY
            const bucket = map.get(g)
            if (bucket) bucket.push(c)
            else map.set(g, [c])
        }
        const ordered: { key: string; label: string; items: MasterItem[] }[] = []
        for (const g of CATEGORY_GROUPS) {
            const items = map.get(g.key)
            if (items && items.length) ordered.push({ key: g.key, label: g.label, items })
        }
        const others = map.get(UNCATEGORIZED_GROUP_KEY)
        if (others && others.length) {
            ordered.push({ key: UNCATEGORIZED_GROUP_KEY, label: 'その他', items: others })
        }
        return ordered
    }, [filteredCategories])

    // 検索中はマッチした全グループを自動展開
    const effectiveOpenGroups = useMemo(() => {
        if (normalizedKw) return new Set(grouped.map((g) => g.key))
        return openGroups
    }, [normalizedKw, grouped, openGroups])

    const toggleGroup = (key: string) => {
        setOpenGroups((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const handleSelect = (id: string) => {
        onChange(id)
        setOpen(false)
    }

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-input bg-white text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
                    {selected ? selected.name : placeholder}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md p-0 gap-0">
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-base">カテゴリを選択</DialogTitle>
                    </DialogHeader>

                    {/* 検索 */}
                    <div className="px-4 pb-3 sticky top-0 bg-white z-10 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="キーワードで検索（例: テニス）"
                                className="pl-8 pr-8 h-9 text-sm"
                                autoFocus
                            />
                            {keyword && (
                                <button
                                    type="button"
                                    onClick={() => setKeyword('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* グループ一覧 */}
                    <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
                        {grouped.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-8">
                                該当するカテゴリがありません
                            </p>
                        )}
                        {grouped.map((g) => {
                            const isOpen = effectiveOpenGroups.has(g.key)
                            return (
                                <div key={g.key} className="border-b border-gray-100 last:border-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(g.key)}
                                        className="flex items-center w-full gap-1 px-2 py-2 text-left hover:bg-gray-50 rounded"
                                    >
                                        {isOpen
                                            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                                        <span className="text-xs font-semibold text-gray-600">{g.label}</span>
                                        <span className="text-[11px] text-gray-400">({g.items.length})</span>
                                    </button>
                                    {isOpen && (
                                        <ul className="pb-1.5">
                                            {g.items.map((c) => {
                                                const isSelected = c.id === selectedId
                                                return (
                                                    <li key={c.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelect(c.id)}
                                                            className={`flex items-center justify-between w-full pl-7 pr-3 py-1.5 text-sm text-left rounded hover:bg-blue-50 ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
                                                        >
                                                            <span>{c.name}</span>
                                                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                                                        </button>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between gap-2">
                        {selected ? (
                            <button
                                type="button"
                                onClick={() => handleSelect('')}
                                className="text-xs text-gray-500 hover:text-red-500"
                            >
                                選択をクリア
                            </button>
                        ) : <span />}
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                            閉じる
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
