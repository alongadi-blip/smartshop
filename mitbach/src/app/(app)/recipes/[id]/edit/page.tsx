import { notFound } from 'next/navigation'

import { draftFromRecipe, RecipeForm } from '@/components/recipe-form'
import { getMyGroups } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import type { Recipe } from '@/lib/types'

export default async function EditRecipePage({ params }: PageProps<'/recipes/[id]/edit'>) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data }, groups] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', id).maybeSingle(),
    getMyGroups(),
  ])

  if (!data) notFound()
  const recipe = data as Recipe

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">עריכת מתכון</h1>
        <p className="text-sm text-muted-foreground">{recipe.title}</p>
      </div>

      <RecipeForm initial={draftFromRecipe(recipe)} groups={groups} recipeId={recipe.id} />
    </div>
  )
}
