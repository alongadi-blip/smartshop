'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Crown, Loader2, UserMinus } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ROLE_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import type { GroupRole } from '@/lib/types'

export type Member = {
  user_id: string
  role: GroupRole
  name: string
  email: string
}

export function MemberRow({
  member,
  groupId,
  isOwner,
  viewerIsAdmin,
  isSelf,
}: {
  member: Member
  groupId: string
  /** The group owner's row is locked: the database refuses to change it. */
  isOwner: boolean
  viewerIsAdmin: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [role, setRole] = useState(member.role)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials =
    member.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || '?'

  async function changeRole(next: GroupRole) {
    const previous = role
    setRole(next)
    setPending(true)
    setError(null)

    const { error: updateError } = await createClient()
      .from('group_members')
      .update({ role: next })
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)

    if (updateError) {
      setRole(previous)
      setError('שינוי ההרשאה נכשל.')
    } else {
      router.refresh()
    }
    setPending(false)
  }

  async function remove() {
    setPending(true)
    setError(null)

    const { error: deleteError } = await createClient()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)

    if (deleteError) {
      setError(isSelf ? 'היציאה מהקבוצה נכשלה.' : 'ההסרה נכשלה.')
      setPending(false)
      return
    }

    if (isSelf) router.push('/groups')
    router.refresh()
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3.5">
      <Avatar className="size-10">
        <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium">
          {member.name}
          {isSelf ? <span className="text-sm text-muted-foreground">(אתם)</span> : null}
          {isOwner ? (
            <Crown className="size-3.5 text-accent" aria-label="בעלי הקבוצה" />
          ) : null}
        </p>
        <p dir="ltr" className="truncate text-start text-sm text-muted-foreground">
          {member.email}
        </p>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {viewerIsAdmin && !isOwner ? (
          <NativeSelect
            aria-label={`הרשאה עבור ${member.name}`}
            className="h-9 w-32"
            value={role}
            disabled={pending}
            onChange={(event) => void changeRole(event.target.value as GroupRole)}
          >
            {(['viewer', 'editor', 'admin'] as const).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
        )}

        {(viewerIsAdmin || isSelf) && !isOwner ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 cursor-pointer text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={remove}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <UserMinus aria-hidden />}
            <span className="sr-only">{isSelf ? 'יציאה מהקבוצה' : `הסרת ${member.name}`}</span>
          </Button>
        ) : null}
      </div>
    </li>
  )
}
