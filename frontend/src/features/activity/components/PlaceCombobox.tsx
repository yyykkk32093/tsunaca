/**
 * PlaceCombobox — 開催場所入力コンポーネント (W6-07)
 *
 * 動作:
 *  1. テキスト入力 → 250ms debounce で BE /v1/places/search を呼ぶ
 *  2. Place マスタ候補を最大10件ドロップダウン表示
 *  3. 候補選択 → defaultPlaceId セット + 表示テキストを place.name に更新
 *  4. 入力テキストを変更 or クリア → defaultPlaceId を null に戻し defaultLocationCustom として扱う
 *  5. マスタ候補に一致しない文字列 → defaultLocationCustom 扱い（マップリンク不可）
 */
import { placeApi } from '@/features/activity/api/placeApi'
import { Input } from '@/shared/components/ui/input'
import type { PlaceSearchItem } from '@/shared/types/api'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface PlaceComboboxProps {
    /** 表示テキスト（制御コンポーネント） */
    inputValue: string
    /** 選択済みの Place ID（null = 自由入力 or 未選択） */
    placeId: string
    onInputChange: (text: string) => void
    onSelect: (place: PlaceSearchItem | null) => void
    placeholder?: string
    disabled?: boolean
    /** 編集時など、既に選択済み Place の住所を初期表示したい場合に指定 */
    initialAddress?: string
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}

export function PlaceCombobox({
    inputValue,
    placeId,
    onInputChange,
    onSelect,
    placeholder = '開催場所を入力',
    disabled = false,
    initialAddress,
}: PlaceComboboxProps) {
    const [items, setItems] = useState<PlaceSearchItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    /** 選択中 Place の住所（補助表示用） */
    const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress ?? '')
    const debouncedQuery = useDebounce(inputValue, 250)
    const containerRef = useRef<HTMLDivElement>(null)

    // debounce 後にクエリ実行
    useEffect(() => {
        const q = debouncedQuery.trim()
        if (q.length < 1) {
            setItems([])
            setIsOpen(false)
            return
        }
        // PlaceID 選択済み & テキストが変わっていない場合は検索しない
        // （選択後に再フォーカスしても候補が再表示されないように）
        setIsLoading(true)
        placeApi.search(q, 10)
            .then((res) => {
                setItems(res.items)
                setIsOpen(res.items.length > 0)
            })
            .catch(() => {
                setItems([])
            })
            .finally(() => setIsLoading(false))
    }, [debouncedQuery])

    // 外クリックで閉じる
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value
        onInputChange(text)
        // テキスト変更時は選択済みの Place を解除（自由入力モードへ）
        if (placeId) {
            onSelect(null)
            setSelectedAddress('')
        }
    }

    const handleSelect = (item: PlaceSearchItem) => {
        onInputChange(item.name)
        onSelect(item)
        setSelectedAddress(item.address ?? '')
        setIsOpen(false)
        setItems([])
    }

    const handleClear = () => {
        onInputChange('')
        onSelect(null)
        setSelectedAddress('')
        setIsOpen(false)
        setItems([])
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    onFocus={() => {
                        if (items.length > 0) setIsOpen(true)
                    }}
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                        aria-label="クリア"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* 補助表示: 選択済み Place の住所（マスタ未一致時は何も出さない） */}
            {placeId && selectedAddress && (
                <p className="mt-1 text-xs text-gray-400 truncate">{selectedAddress}</p>
            )}

            {/* 候補ドロップダウン */}
            {isOpen && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md max-h-60 overflow-y-auto">
                    {isLoading && (
                        <li className="px-3 py-2 text-sm text-gray-400">検索中...</li>
                    )}
                    {!isLoading && items.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                                onMouseDown={(e) => e.preventDefault()} // blur より先に select を発火
                                onClick={() => handleSelect(item)}
                            >
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                {item.address && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.address}</p>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
