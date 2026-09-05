import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CalendarDays, Lock, Users } from 'lucide-react'

import { DeleteButton } from '@/components/delete-button'
import {
  MenuBoard,
  type BoardItem,
  type LinkableRecipe,
  type MenuMember,
} from '@/components/menu-board'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatEventDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Menu, MenuItem } from '@/lib/types'

export default async function MenuPage({ params }: PageProps<'/menus/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: userData }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('menus').select('*, groups(id, name)').eq('id', id).maybeSingle(),
  ])

  if (!data) notFound()

  const menu = data as unknown as Menu & { groups: { id: string; name: string } | null }
  const userId = userData.user!.id

  const [{ data: itemRows }, { data: membership }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('*, profiles(name), recipes(title)')
      .eq('menu_id', id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    menu.group_id
      ? supabase
          .from('group_members')
          .select('role')
          .eq('group_id', menu.group_id)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const role = membership?.role ?? null
  const isCreator = menu.created_by === userId
  const canEdit = isCreator || (!menu.is_private && (role === 'admin' || role === 'editor'))
  const canDelete = isCreator || (!menu.is_private && role === 'admin')

  const items: BoardItem[] = (itemRows ?? []).map((row) => {
    const item = row as unknown as MenuItem & {
      profiles: { name: string | null } | null
      recipes: { title: string } | null
    }
    return {
      ...item,
      assigneeName: item.profiles?.name ?? item.assigned_name,
      recipeTitle: item.recipes?.title ?? null,
    }
  })

  // Only a shared menu has other people to assign dishes to.
  const members: MenuMember[] = menu.group_id
    ? ((
        await supabase
          .from('group_members')
          .select('user_id, profiles(name, email)')
          .eq('group_id', menu.group_id)
      ).data ?? []
      ).map((row) => {
        const profile = row.profiles as unknown as { name: string | null; email: string } | null
        return {
          id: row.user_id,
          name: profile?.name ?? profile?.email?.split('@')[0] ?? 'חבר קבוצה',
        }
      })
    : []

  const { data: recipeRows } = await supabase
    .from('recipes')
    .select('id, title')
    .order('title', { ascending: true })
    .limit(200)

  const recipes: LinkableRecipe[] = recipeRows ?? []
  const date = formatEventDate(menu.event_date)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/menus"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowRight className="size-4" aria-hidden />
        לכל התפריטים
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {menu.is_private ? (
              <>
                <Lock className="size-3" aria-hidden />
                פרטי
              </>
            ) : (
              <>
                <Users className="size-3" aria-hidden />
                {menu.groups?.name ?? 'משותף'}
              </>
            )}
          </Badge>
        </div>

        <h1 className="font-heading text-2xl font-bold text-balance sm:text-3xl">{menu.title}</h1>

        {date ? (
          <p className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            {date}
          </p>
        ) : null}

        {menu.notes ? <p className="text-pretty text-muted-foreground">{menu.notes}</p> : null}
      </header>

      <MenuBoard
        menuId={menu.id}
        items={items}
        members={members}
        recipes={recipes}
        canEdit={canEdit}
      />

      {canDelete ? (
        <>
          <Separator />
          <DeleteButton
            table="menus"
            id={menu.id}
            redirectTo="/menus"
            label="מחיקת התפריט"
            title="למחוק את התפריט?"
            description={`"${menu.title}" וכל הפריטים שבו יימחקו. המתכונים המקושרים יישארו.`}
          />
        </>
      ) : null}
    </div>
  )
}
