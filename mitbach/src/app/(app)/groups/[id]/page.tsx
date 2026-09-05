import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { DeleteButton } from '@/components/delete-button'
import { InviteDialog } from '@/components/invite-dialog'
import { MemberRow, type Member } from '@/components/member-row'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatRelativeDate, ROLE_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { GroupRole } from '@/lib/types'

export default async function GroupPage({ params }: PageProps<'/groups/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: userData }, { data: group }, { data: memberRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('groups').select('id, name, description, owner_id').eq('id', id).maybeSingle(),
    supabase
      .from('group_members')
      .select('user_id, role, created_at, profiles(name, email)')
      .eq('group_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!group) notFound()

  const userId = userData.user!.id
  const members: Member[] = (memberRows ?? []).map((row) => {
    const profile = row.profiles as unknown as { name: string | null; email: string } | null
    return {
      user_id: row.user_id,
      role: row.role as GroupRole,
      name: profile?.name ?? profile?.email?.split('@')[0] ?? 'חבר קבוצה',
      email: profile?.email ?? '',
    }
  })

  const myRole = members.find((m) => m.user_id === userId)?.role ?? null
  const isAdmin = myRole === 'admin'
  const isOwner = group.owner_id === userId

  const { data: invitations } = isAdmin
    ? await supabase
        .from('invitations')
        .select('id, code, note, email, role, expires_at')
        .eq('group_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: null }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/groups"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowRight className="size-4" aria-hidden />
        לכל הקבוצות
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{group.name}</h1>
          {group.description ? (
            <p className="text-pretty text-muted-foreground">{group.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {members.length} חברים · ההרשאה שלכם: {myRole ? ROLE_LABELS[myRole] : '—'}
          </p>
        </div>

        {isAdmin ? <InviteDialog groupId={group.id} groupName={group.name} /> : null}
      </header>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">חברי הקבוצה</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {members.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              groupId={group.id}
              isOwner={member.user_id === group.owner_id}
              viewerIsAdmin={isAdmin}
              isSelf={member.user_id === userId}
            />
          ))}
        </ul>
      </section>

      {invitations && invitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-bold">הזמנות שממתינות</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-3.5 text-sm">
                <code dir="ltr" className="font-mono font-semibold">
                  {invitation.code}
                </code>

                {invitation.note ? (
                  <span className="text-muted-foreground">{invitation.note}</span>
                ) : null}

                {invitation.email ? (
                  <span dir="ltr" className="text-muted-foreground">
                    {invitation.email}
                  </span>
                ) : null}

                <span className="ms-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    בתוקף עד {formatRelativeDate(invitation.expires_at)}
                  </span>
                  <Badge variant="secondary">{ROLE_LABELS[invitation.role as GroupRole]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold">אזור מסוכן</h2>
            <p className="text-sm text-muted-foreground">
              מחיקת הקבוצה מסירה את כל חבריה. מתכונים ותפריטים ששותפו איתה יחזרו להיות פרטיים
              אצל מי שיצר אותם.
            </p>
            <DeleteButton
              table="groups"
              id={group.id}
              redirectTo="/groups"
              label="מחיקת הקבוצה"
              title="למחוק את הקבוצה?"
              description={`הקבוצה "${group.name}" תימחק וכל חבריה יאבדו את הגישה למה ששותף בה.`}
            />
          </section>
        </>
      ) : null}
    </div>
  )
}
