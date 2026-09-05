import Link from 'next/link'
import { BookOpen, Plus } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'
import { RecipeCard, type RecipeCardData } from '@/components/recipe-card'
import { RecipeFilters } from '@/components/recipe-filters'
import { Button } from '@/components/ui/button'
import { getMyGroups } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

/**
 * PostgREST parses `or=(...)` as a filter expression, so a search term has to
 * be stripped of the characters that would let it break out of the string.
 */
function sanitizeSearch(term: string) {
  return term.replace(/[,()*\\":]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export default async function CatalogPage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? sanitizeSearch(params.q) : ''
  const scope = typeof params.scope === 'string' ? params.scope : 'all'
  const tag = typeof params.tag === 'string' ? params.tag : null

  const supabase = await createClient()
  const [groups, { data: userData }] = await Promise.all([getMyGroups(), supabase.auth.getUser()])
  const userId = userData.user!.id

  let query = supabase
    .from('recipes')
    .select(
      'id, title, description, image_url, prep_minutes, cook_minutes, is_private, tags, group_id, groups(name)',
    )
    .order('created_at', { ascending: false })
    .limit(60)

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  if (tag) query = query.contains('tags', [tag])

  if (scope === 'mine') {
    query = query.eq('owner_id', userId).eq('is_private', true)
  } else if (scope !== 'all') {
    query = query.eq('group_id', scope).eq('is_private', false)
  }

  const { data, error } = await query

  const recipes: RecipeCardData[] = (data ?? []).map((row) => ({
    ...row,
    groupName: (row.groups as unknown as { name: string } | null)?.name ?? null,
  }))

  const filtered = Boolean(q || tag || scope !== 'all')

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">המתכונים</h1>
          <p className="text-sm text-muted-foreground">
            {recipes.length > 0 ? `${recipes.length} מתכונים` : 'עוד לא נשמרו מתכונים'}
          </p>
        </div>
      </div>

      <RecipeFilters groups={groups} />

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          טעינת המתכונים נכשלה. רעננו את הדף ונסו שוב.
        </p>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filtered ? 'אין מתכונים שמתאימים לסינון' : 'עוד אין כאן מתכונים'}
          description={
            filtered
              ? 'נסו מונח חיפוש אחר, או הסירו את הסינון.'
              : 'הדביקו קישור מאינסטגרם, מפייסבוק או מאתר מתכונים — ונשלוף משם את המצרכים וההוראות.'
          }
          action={
            filtered ? (
              <Button variant="outline" render={<Link href="/" />} className="cursor-pointer">
                ניקוי הסינון
              </Button>
            ) : (
              <Button render={<Link href="/recipes/new" />} className="cursor-pointer">
                <Plus data-icon="inline-start" aria-hidden />
                הוספת המתכון הראשון
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="flex">
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
