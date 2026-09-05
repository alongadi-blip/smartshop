import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, ExternalLink, Lock, Pencil, Users, UtensilsCrossed } from 'lucide-react'

import { DeleteButton } from '@/components/delete-button'
import { IngredientChecklist } from '@/components/ingredient-checklist'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatMinutes, SOURCE_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import type { Recipe } from '@/lib/types'

export default async function RecipePage({ params }: PageProps<'/recipes/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: userData }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('recipes').select('*, groups(id, name)').eq('id', id).maybeSingle(),
  ])

  // RLS turns "not allowed to see it" into "does not exist", which is exactly
  // what we want to show the user anyway.
  if (!data) notFound()

  const recipe = data as unknown as Recipe & { groups: { id: string; name: string } | null }
  const userId = userData.user!.id

  const { data: membership } = recipe.group_id
    ? await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', recipe.group_id)
        .eq('user_id', userId)
        .maybeSingle()
    : { data: null }

  const isOwner = recipe.owner_id === userId
  const role = membership?.role ?? null
  const canEdit = isOwner || (!recipe.is_private && (role === 'admin' || role === 'editor'))
  const canDelete = isOwner || (!recipe.is_private && role === 'admin')

  const prep = formatMinutes(recipe.prep_minutes)
  const cook = formatMinutes(recipe.cook_minutes)

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      {recipe.image_url ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-secondary">
          <Image
            src={recipe.image_url}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 48rem, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {recipe.is_private ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" aria-hidden />
              פרטי
            </Badge>
          ) : recipe.groups ? (
            <Badge variant="secondary" className="gap-1">
              <Users className="size-3" aria-hidden />
              {recipe.groups.name}
            </Badge>
          ) : null}

          {recipe.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="cursor-pointer rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground transition-colors duration-200 hover:bg-accent/20"
            >
              {tag}
            </Link>
          ))}
        </div>

        <h1 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{recipe.title}</h1>

        {recipe.description ? (
          <p className="text-pretty text-muted-foreground">{recipe.description}</p>
        ) : null}

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {prep ? <Meta icon={Clock} label="הכנה" value={prep} /> : null}
          {cook ? <Meta icon={Clock} label="בישול" value={cook} /> : null}
          {recipe.servings ? (
            <Meta icon={UtensilsCrossed} label="מנות" value={recipe.servings} />
          ) : null}
        </dl>

        {recipe.source_url ? (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {recipe.source_name ?? SOURCE_LABELS[recipe.source_type]}
          </a>
        ) : null}
      </header>

      <Separator />

      <div className="grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr]">
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold">מצרכים</h2>
          {recipe.ingredients.length > 0 ? (
            <IngredientChecklist ingredients={recipe.ingredients} />
          ) : (
            <p className="text-sm text-muted-foreground">לא נשמרו מצרכים.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold">אופן ההכנה</h2>
          {recipe.instructions.length > 0 ? (
            <ol className="space-y-4">
              {recipe.instructions.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-pretty leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">לא נשמרו הוראות הכנה.</p>
          )}
        </section>
      </div>

      {recipe.notes ? (
        <section className="rounded-2xl border border-border bg-secondary/50 p-4">
          <h2 className="font-heading text-base font-bold">הערות</h2>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{recipe.notes}</p>
        </section>
      ) : null}

      {canEdit || canDelete ? (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button
                variant="outline"
                render={<Link href={`/recipes/${recipe.id}/edit`} />}
                className="cursor-pointer"
              >
                <Pencil data-icon="inline-start" aria-hidden />
                עריכה
              </Button>
            ) : null}

            {canDelete ? (
              <DeleteButton
                table="recipes"
                id={recipe.id}
                redirectTo="/"
                title="למחוק את המתכון?"
                description={`"${recipe.title}" יימחק לצמיתות. אי אפשר לבטל את הפעולה.`}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </article>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
