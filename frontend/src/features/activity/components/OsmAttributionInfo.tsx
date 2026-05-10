/**
 * OsmAttributionInfo — 位置情報データの出典案内
 *
 * `?` アイコンをクリックするとモーダルが開き、OpenStreetMap の出典・ライセンス・
 * 公式著作権ページへのリンクを案内する。外部サイトへ直接遷移させず、
 * ユーザーが内容を理解した上でリンクを踏める導線にしている。
 */
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog'
import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

interface OsmAttributionInfoProps {
    /** アイコンのサイズ（Tailwind class、例: 'w-3.5 h-3.5'） */
    iconClassName?: string
}

export function OsmAttributionInfo({
    iconClassName = 'w-3.5 h-3.5',
}: OsmAttributionInfoProps) {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label="位置情報データの出典について"
                    className="text-gray-400 hover:text-gray-600"
                >
                    <HelpCircle className={iconClassName} />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>位置情報データの出典</DialogTitle>
                    <DialogDescription>
                        本アプリの開催場所候補は OpenStreetMap のオープンデータを利用しています。
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm text-gray-700">
                    <p>
                        © OpenStreetMap contributors
                    </p>
                    <p className="text-xs text-gray-500">
                        ライセンス: Open Database License (ODbL)
                    </p>
                    <p className="text-xs text-gray-500">
                        詳細・公式著作権ページ:
                    </p>
                    <p className="text-xs break-all">
                        <a
                            href="https://www.openstreetmap.org/copyright"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            https://www.openstreetmap.org/copyright
                        </a>
                    </p>
                </div>
                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                        閉じる
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
