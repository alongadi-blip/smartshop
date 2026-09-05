import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Lock, Users } from 'lucide-react'

import { CreateMenu } from '@/components/create-menu'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatEventDate } from '@/lib/format'
import { getMyGroups } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'תפריטים · מטבח' }

export default async function MenusPage() {
  const supabase = await createClient()

  const [groups, { data: menus }] = await Promise.all([
    getMyGroups(),
    supabase
      .from('menus')
      .select('id, title, event_date, is_private, groups(name), menu_items(count)')
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const rows = menus ?? []
  const upcoming = rows.filter((m) => m.event_date && m.event_date >= today)
  const rest = rows.filter((m) => !m.event_date || m.event_date < today)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">תפריטים</h1>
          <p className="text-sm text-muted-foreground">חגים, אירועים, וארוחות שצריך לתאם.</p>
        </div>

        <CreateMenu groups={groups} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="עדיין אין תפריטים"
          description="בנו תפריט לחג או לאירוע, חלקו אותו לקטגוריות, ורשמו מי מביא מה. אפשר גם בלי מתכונים שמורים."
          action={<CreateMenu groups={groups} />}
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <MenuGroup title="קרובים" menus={upcoming} highlight />
          ) : null}
          {rest.length > 0 ? (
            <MenuGroup title={upcoming.length > 0 ? 'קודמים' : 'הכול'} menus={rest} />
          ) : null}
        </>
      )}
    </div>
  )
}

type MenuRow = {
  id: string
  title: string
  event_date: string | null
  is_private: boolean
  groups: unknown
  menu_items: unknown
}

function MenuGroup({
  title,
  menus,
  highlight = false,
}: {
  title: string
  menus: MenuRow[]
  highlight?: boolean
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-bold">{title}</h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {menus.map((menu) => {
          const group = (menu.groups as { name: string } | null) ?? null
          const count = (menu.menu_items as { count: number }[] | null)?.[0]?.count ?? 0
          const date = formatEventDate(menu.event_date)

          return (
            <li key={menu.id}>
              <Link
                href={`/menus/${menu.id}`}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border bg-card p-4 transition-colors duration-200 hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                  highlight ? 'border-primary/30' : 'border-border'
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-heading text-lg font-bold text-balance">{menu.title}</span>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    {menu.is_private ? (
                      <>
                        <Lock className="size-3" aria-hidden />
                        פרטי
                      </>
                    ) : (
                      <>
                        <Users className="size-3" aria-hidden />
                        {group?.name ?? 'משותף'}
                      </>
                    )}
                  </Badge>
                </span>

                <span className="text-sm text-muted-foreground">
                  {date ?? 'ללא תאריך'} · {count} פריטים
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
