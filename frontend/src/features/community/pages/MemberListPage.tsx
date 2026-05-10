import { useMembers } from '@/features/community/hooks/useMemberQueries'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { useParams } from 'react-router-dom'

/**
 * MemberListPage — メンバー一覧画面（UBL-33）
 *
 * コミュニティのメンバーをアバター + 名前 + ロールで表示。
 */
export function MemberListPage() {
    const { id: communityId } = useParams<{ id: string }>()
    const { data, isLoading } = useMembers(communityId!)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
        )
    }

    const members = data?.members ?? []

    // Sort: OWNER → ADMIN → MEMBER
    const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 }
    const sorted = [...members].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3))

    return (
        <div className="p-4 space-y-3">
            <p className="text-sm text-gray-500">{members.length}人のメンバー</p>

            {sorted.map((member) => (
                <Card key={member.id} className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName ?? ''} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                            {member.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {member.displayName ?? '名前未設定'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(member.joinedAt).toLocaleDateString('ja-JP')} 参加
                        </p>
                    </div>

                    <RoleBadge role={member.role} />
                </Card>
            ))}

            {members.length === 0 && (
                <p className="text-center text-gray-400 py-8">メンバーがいません</p>
            )}
        </div>
    )
}

function RoleBadge({ role }: { role: string }) {
    switch (role) {
        case 'OWNER':
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">オーナー</Badge>
        case 'ADMIN':
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">管理者</Badge>
        default:
            return <Badge variant="secondary">メンバー</Badge>
    }
}
