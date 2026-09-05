import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Users } from 'lucide-react'

import { CreateGroup } from '@/components/create-group'
import { EmptyState } from '@/components/empty-state'
import { InviteDialog } from '@/components/invite-dialog'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/format'
import { getMyGroups } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import type { GroupRole } from '@/lib/types'

export const metadata: Metadata = { title: 'קבוצות · מטבח' }

export default async function GroupsPage() {
  const groups = await getMyGroups()

  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('invitations')
    .select('id, code, note, email, expires_at, group_id, role')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">קבוצות</h1>
          <p className="text-sm text-muted-foreground">
            עם מי אתם חולקים מתכונים ותפריטים.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <InviteDialog label="הזמנה למטבח" />
          <CreateGroup />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="עדיין אין קבוצות"
          description="פתחו קבוצה למשפחה או לחברים, והזמינו אליה אנשים. מתכון פרטי נשאר פרטי גם אחר כך."
          action={<CreateGroup />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                  <Users className="size-5" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading font-bold">{group.name}</span>
                  <span className="text-sm text-muted-foreground">{ROLE_LABELS[group.role]}</span>
                </span>

                <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pending && pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-bold">הזמנות פתוחות</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <code dir="ltr" className="font-mono text-sm font-semibold">
                  {invitation.code}
                </code>

                {invitation.note ? (
                  <span className="text-sm text-muted-foreground">{invitation.note}</span>
                ) : null}

                {invitation.email ? (
                  <span dir="ltr" className="text-sm text-muted-foreground">
                    {invitation.email}
                  </span>
                ) : null}

                <span className="ms-auto">
                  <Badge variant="secondary">
                    {invitation.group_id
                      ? ROLE_LABELS[invitation.role as GroupRole]
                      : 'גישה למערכת'}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
