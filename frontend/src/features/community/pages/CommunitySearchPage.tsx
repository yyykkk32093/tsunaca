import { AdBanner } from '@/features/ads/components/AdBanner'
import {
    useCommunityMasters,
    useSearchCommunities,
} from '@/features/community/hooks/useCommunityQueries'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import {
    ChevronDown,
    ChevronUp,
    Search,
    Users,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GENDER_OPTIONS = [
    { value: 'MALE', label: '男性' },
    { value: 'FEMALE', label: '女性' },
    { value: 'OTHER', label: 'その他' },
    { value: 'ANY', label: '指定なし' },
] as const

const JOIN_METHOD_OPTIONS = [
    { value: 'OPEN', label: '自由参加' },
    { value: 'APPROVAL', label: '承認制' },
    { value: 'INVITE_ONLY', label: '招待のみ' },
] as const

/**
 * CommunitySearchPage — 公開コミュニティ検索画面
 *
 * - キーワード検索バー
 * - カテゴリフィルター (タグチップ)
 * - 詳細検索パネル（折りたたみ: 参加レベル、エリア、活動曜日、対象性別、コミュニティタイプ、参加方法）
 * - 検索結果リスト
 */
export function CommunitySearchPage() {
    const navigate = useNavigate()
    const { data: masters } = useCommunityMasters()

    const [keyword, setKeyword] = useState('')
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedLevels, setSelectedLevels] = useState<string[]>([])
    const [area, setArea] = useState('')
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [selectedGenders, setSelectedGenders] = useState<string[]>([])
    const [selectedJoinMethod, setSelectedJoinMethod] = useState('')
    const [showDetail, setShowDetail] = useState(false)
    const [searchTriggered, setSearchTriggered] = useState(false)

    const searchParams = useMemo(
        () => ({
            keyword: keyword || undefined,
            categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
            levelIds: selectedLevels.length > 0 ? selectedLevels : undefined,
            area: area || undefined,
            days: selectedDays.length > 0 ? selectedDays : undefined,
            targetGender: selectedGenders.length > 0 ? selectedGenders : undefined,
            joinMethod: selectedJoinMethod || undefined,
            limit: 20,
        }),
        [keyword, selectedCategories, selectedLevels, area, selectedDays, selectedGenders, selectedJoinMethod],
    )

    const { data, isLoading } = useSearchCommunities(searchParams, searchTriggered)

    const handleSearch = useCallback(() => {
        setSearchTriggered(true)
    }, [])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') handleSearch()
        },
        [handleSearch],
    )

    const toggleCategory = (id: string) => {
        setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
        )
        setSearchTriggered(false)
    }

    const toggleLevel = (id: string) => {
        setSelectedLevels((prev) =>
            prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
        )
        setSearchTriggered(false)
    }

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        )
        setSearchTriggered(false)
    }

    const toggleGender = (value: string) => {
        setSelectedGenders((prev) =>
            prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
        )
        setSearchTriggered(false)
    }

    const DAYS = ['月', '火', '水', '木', '金', '土', '日']

    return (
        <div className="flex flex-col h-full">
            {/* 検索バー */}
            <div className="px-4 pt-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="キーワードで検索..."
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                            setSearchTriggered(false)
                        }}
                        onKeyDown={handleKeyDown}
                        className="pl-9 pr-4"
                    />
                </div>
            </div>

            {/* [4] コミュニティ検索 — 検索テキストボックス直下 */}
            <AdBanner slotId="community-search-below" />

            {/* 詳細検索トグル */}
            <div className="px-4 pb-2">
                <button
                    onClick={() => setShowDetail(!showDetail)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                    詳細検索
                    {showDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* 詳細検索パネル */}
            {showDetail && (
                <div className="px-4 pb-3 space-y-3 border-b border-gray-100">
                    {/* カテゴリ */}
                    {masters?.categories && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">カテゴリ</p>
                            <div className="flex flex-wrap gap-1.5">
                                {masters.categories.map((cat) => (
                                    <Badge
                                        key={cat.id}
                                        variant={selectedCategories.includes(cat.id) ? 'default' : 'outline'}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleCategory(cat.id)}
                                    >
                                        {cat.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 参加レベル */}
                    {masters?.participationLevels && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">参加レベル</p>
                            <div className="flex flex-wrap gap-1.5">
                                {masters.participationLevels.map((lv) => (
                                    <Badge
                                        key={lv.id}
                                        variant={selectedLevels.includes(lv.id) ? 'default' : 'outline'}
                                        className="cursor-pointer text-xs"
                                        onClick={() => toggleLevel(lv.id)}
                                    >
                                        {lv.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* エリア */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">エリア</p>
                        <Input
                            placeholder="例: 新宿、渋谷..."
                            value={area}
                            onChange={(e) => {
                                setArea(e.target.value)
                                setSearchTriggered(false)
                            }}
                            className="text-sm"
                        />
                    </div>

                    {/* 活動曜日 */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">活動曜日</p>
                        <div className="flex gap-1.5">
                            {DAYS.map((day) => (
                                <Badge
                                    key={day}
                                    variant={selectedDays.includes(day) ? 'default' : 'outline'}
                                    className="cursor-pointer text-xs"
                                    onClick={() => toggleDay(day)}
                                >
                                    {day}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* W4-03: 対象性別 */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">対象性別</p>
                        <div className="flex flex-wrap gap-1.5">
                            {GENDER_OPTIONS.map((opt) => (
                                <Badge
                                    key={opt.value}
                                    variant={selectedGenders.includes(opt.value) ? 'default' : 'outline'}
                                    className="cursor-pointer text-xs"
                                    onClick={() => toggleGender(opt.value)}
                                >
                                    {opt.label}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* W4-03: 参加方法 */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">参加方法</p>
                        <Select
                            value={selectedJoinMethod}
                            onValueChange={(v) => {
                                setSelectedJoinMethod(v === '__all__' ? '' : v)
                                setSearchTriggered(false)
                            }}
                        >
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="すべて" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">すべて</SelectItem>
                                {JOIN_METHOD_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* 検索ボタン */}
            <div className="px-4 py-2">
                <Button onClick={handleSearch} className="w-full" size="sm">
                    <Search className="w-4 h-4 mr-1" />
                    検索する
                </Button>
            </div>

            {/* 検索結果 */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : !searchTriggered ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Search className="w-10 h-10 mb-2" />
                        <p className="text-sm">条件を入力して検索してください</p>
                    </div>
                ) : data && data.communities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <p className="text-sm">条件に一致するコミュニティが見つかりませんでした</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {data?.communities.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => navigate(`/communities/search/${c.id}`)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                        {c.logoUrl ? (
                                            <img src={c.logoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            c.name.charAt(0)
                                        )}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                                        {c.description && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                            <span className="flex items-center gap-0.5">
                                                <Users className="w-3 h-3" />
                                                {c.memberCount}人
                                            </span>
                                            {c.activityFrequency && (
                                                <span>{c.activityFrequency}</span>
                                            )}
                                        </div>
                                        {/* W4-03: 性別・年齢 */}
                                        {(c.targetGender.length > 0 || c.ageMin != null || c.ageMax != null) && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {c.targetGender.map((g) => (
                                                    <span key={g} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                                                        {g === 'MALE' ? '男性' : g === 'FEMALE' ? '女性' : g === 'OTHER' ? 'その他' : '指定なし'}
                                                    </span>
                                                ))}
                                                {(c.ageMin != null || c.ageMax != null) && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                                                        {c.ageMin ?? 0}歳〜{c.ageMax ?? ''}歳
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {c.categories.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {c.categories.map((cat) => (
                                                    <span key={cat.id} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                                                        {cat.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {data && data.total > 0 && (
                    <p className="text-center text-xs text-gray-400 py-3">
                        {data.total}件中 {data.communities.length}件を表示
                    </p>
                )}
            </div>
        </div>
    )
}
