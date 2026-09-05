'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GripVertical, ImageOff, Loader2, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import type { ExtractedRecipe, Ingredient, Recipe, RecipeSource } from '@/lib/types'
import type { MyGroup } from '@/lib/queries'

export type RecipeDraft = {
  title: string
  description: string
  image_url: string | null
  source_url: string | null
  source_type: RecipeSource
  source_name: string | null
  servings: string
  prep_minutes: string
  cook_minutes: string
  ingredients: Ingredient[]
  instructions: string[]
  tags: string[]
  notes: string
  is_private: boolean
  group_id: string | null
}

export function draftFromExtraction(extracted: ExtractedRecipe): RecipeDraft {
  return {
    title: extracted.title,
    description: extracted.description ?? '',
    image_url: extracted.image_url,
    source_url: extracted.source_url,
    source_type: extracted.source_type,
    source_name: extracted.source_name,
    servings: extracted.servings ?? '',
    prep_minutes: extracted.prep_minutes ? String(extracted.prep_minutes) : '',
    cook_minutes: extracted.cook_minutes ? String(extracted.cook_minutes) : '',
    ingredients: extracted.ingredients.length ? extracted.ingredients : [blankIngredient()],
    instructions: extracted.instructions.length ? extracted.instructions : [''],
    tags: extracted.tags,
    notes: '',
    is_private: true,
    group_id: null,
  }
}

export function draftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    title: recipe.title,
    description: recipe.description ?? '',
    image_url: recipe.image_url,
    source_url: recipe.source_url,
    source_type: recipe.source_type,
    source_name: recipe.source_name,
    servings: recipe.servings ?? '',
    prep_minutes: recipe.prep_minutes ? String(recipe.prep_minutes) : '',
    cook_minutes: recipe.cook_minutes ? String(recipe.cook_minutes) : '',
    ingredients: recipe.ingredients.length ? recipe.ingredients : [blankIngredient()],
    instructions: recipe.instructions.length ? recipe.instructions : [''],
    tags: recipe.tags,
    notes: recipe.notes ?? '',
    is_private: recipe.is_private,
    group_id: recipe.group_id,
  }
}

const blankIngredient = (): Ingredient => ({ quantity: null, unit: null, item: '', note: null })

/** Images from an extraction live on someone else's CDN and expire. */
function isForeignImage(url: string | null) {
  if (!url) return false
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return true
  try {
    return new URL(url).hostname !== new URL(base).hostname
  } catch {
    return true
  }
}

export function RecipeForm({
  initial,
  groups,
  recipeId,
}: {
  initial: RecipeDraft
  groups: MyGroup[]
  /** Present when editing; absent when creating. */
  recipeId?: string
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(initial)
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const editable = groups.filter((g) => g.role === 'admin' || g.role === 'editor')
  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }))
  }

  function moveIngredient(index: number, direction: -1 | 1) {
    const target = index + direction
    setDraft((current) => {
      if (target < 0 || target >= current.ingredients.length) return current
      const next = [...current.ingredients]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, ingredients: next }
    })
  }

  function addTag() {
    const tag = tagInput.trim().replace(/^#/, '')
    if (!tag || draft.tags.includes(tag)) return setTagInput('')
    set('tags', [...draft.tags, tag])
    setTagInput('')
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const ingredients = draft.ingredients.filter((i) => i.item.trim())
    const instructions = draft.instructions.map((s) => s.trim()).filter(Boolean)

    if (!draft.title.trim()) return setError('צריך לתת למתכון שם.')
    if (ingredients.length === 0 && instructions.length === 0) {
      return setError('הוסיפו לפחות מצרך אחד או שלב הכנה אחד.')
    }
    if (!draft.is_private && !draft.group_id) {
      return setError('בחרו קבוצה לשיתוף, או סמנו את המתכון כפרטי.')
    }

    setPending(true)

    try {
      let imageUrl = draft.image_url

      // Copy a scraped cover into our own bucket, so the recipe still has a
      // picture after the source CDN link expires. A failure here is not worth
      // losing the recipe over — save it without the image.
      if (isForeignImage(imageUrl)) {
        const response = await fetch('/api/images', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        })
        const data = await response.json().catch(() => null)
        imageUrl = response.ok && data?.url ? data.url : null
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('no session')

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        image_url: imageUrl,
        source_url: draft.source_url?.trim() || null,
        source_type: draft.source_type,
        source_name: draft.source_name,
        servings: draft.servings.trim() || null,
        prep_minutes: draft.prep_minutes ? Number(draft.prep_minutes) : null,
        cook_minutes: draft.cook_minutes ? Number(draft.cook_minutes) : null,
        ingredients,
        instructions,
        tags: draft.tags,
        notes: draft.notes.trim() || null,
        is_private: draft.is_private,
        // Cleared alongside is_private by the visibility field, so a private
        // recipe never keeps a stale group association.
        group_id: draft.group_id,
      }

      const { data, error: saveError } = recipeId
        ? await supabase.from('recipes').update(payload).eq('id', recipeId).select('id').single()
        : await supabase
            .from('recipes')
            .insert({ ...payload, owner_id: user.id })
            .select('id')
            .single()

      if (saveError || !data) throw saveError ?? new Error('save failed')

      router.push(`/recipes/${data.id}`)
      router.refresh()
    } catch {
      setError('השמירה נכשלה. בדקו את ההרשאות שלכם בקבוצה ונסו שוב.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">שם המתכון</Label>
          <Input
            id="title"
            required
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            className="h-12 font-heading text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">תיאור קצר</Label>
          <Textarea
            id="description"
            rows={2}
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <ImageField url={draft.image_url} onClear={() => set('image_url', null)} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="servings">כמות מנות</Label>
            <Input
              id="servings"
              placeholder="4 מנות"
              value={draft.servings}
              onChange={(e) => set('servings', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep">זמן הכנה (דק׳)</Label>
            <Input
              id="prep"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.prep_minutes}
              onChange={(e) => set('prep_minutes', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cook">זמן בישול (דק׳)</Label>
            <Input
              id="cook"
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.cook_minutes}
              onChange={(e) => set('cook_minutes', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">מצרכים</h2>

        <ul className="space-y-2">
          {draft.ingredients.map((ingredient, index) => (
            <li
              key={index}
              className="grid grid-cols-[5rem_1fr_2.5rem] items-start gap-2 sm:grid-cols-[5rem_7rem_1fr_2.5rem]"
            >
              <Input
                aria-label={`כמות למצרך ${index + 1}`}
                placeholder="כמות"
                className="col-start-1 row-start-1"
                value={ingredient.quantity ?? ''}
                onChange={(e) => updateIngredient(index, { quantity: e.target.value || null })}
              />
              <Input
                aria-label={`יחידת מידה למצרך ${index + 1}`}
                placeholder="יחידה"
                className="col-start-2 row-start-1"
                value={ingredient.unit ?? ''}
                onChange={(e) => updateIngredient(index, { unit: e.target.value || null })}
              />
              <Input
                aria-label={`מצרך ${index + 1}`}
                placeholder="מצרך"
                className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"
                value={ingredient.item}
                onChange={(e) => updateIngredient(index, { item: e.target.value })}
              />

              <div className="col-start-3 row-span-2 row-start-1 flex flex-col gap-1 sm:col-start-4 sm:row-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 cursor-pointer text-muted-foreground"
                  onClick={() =>
                    set(
                      'ingredients',
                      draft.ingredients.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  <span className="sr-only">מחיקת מצרך {index + 1}</span>
                </Button>

                {index > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 cursor-pointer text-muted-foreground sm:hidden"
                    onClick={() => moveIngredient(index, -1)}
                  >
                    <GripVertical aria-hidden />
                    <span className="sr-only">העברת מצרך {index + 1} למעלה</span>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => set('ingredients', [...draft.ingredients, blankIngredient()])}
        >
          <Plus data-icon="inline-start" aria-hidden />
          הוספת מצרך
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">אופן ההכנה</h2>

        <ol className="space-y-2">
          {draft.instructions.map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              <Textarea
                aria-label={`שלב ${index + 1}`}
                rows={2}
                className="flex-1"
                value={step}
                onChange={(e) =>
                  set(
                    'instructions',
                    draft.instructions.map((s, i) => (i === index ? e.target.value : s)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 size-10 shrink-0 cursor-pointer text-muted-foreground"
                onClick={() =>
                  set(
                    'instructions',
                    draft.instructions.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 aria-hidden />
                <span className="sr-only">מחיקת שלב {index + 1}</span>
              </Button>
            </li>
          ))}
        </ol>

        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => set('instructions', [...draft.instructions, ''])}
        >
          <Plus data-icon="inline-start" aria-hidden />
          הוספת שלב
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">תגיות</h2>

        <div className="flex flex-wrap gap-2">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                className="cursor-pointer rounded-full p-0.5 transition-colors duration-200 hover:bg-background"
                onClick={() =>
                  set(
                    'tags',
                    draft.tags.filter((t) => t !== tag),
                  )
                }
              >
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">הסרת התגית {tag}</span>
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            aria-label="תגית חדשה"
            placeholder="חלבי, פסח, קינוח…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag()
              }
            }}
          />
          <Button type="button" variant="outline" className="cursor-pointer" onClick={addTag}>
            הוספה
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">מי רואה את זה</h2>

        <VisibilityField
          isPrivate={draft.is_private}
          groupId={draft.group_id}
          groups={editable}
          onChange={(isPrivate, groupId) =>
            setDraft((current) => ({ ...current, is_private: isPrivate, group_id: groupId }))
          }
        />

        <div className="space-y-2">
          <Label htmlFor="notes">הערות אישיות</Label>
          <Textarea
            id="notes"
            rows={2}
            placeholder="בפעם הבאה פחות סוכר…"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">קישור למקור</Label>
          <Input
            id="source"
            dir="ltr"
            className="field-ltr"
            placeholder="https://…"
            value={draft.source_url ?? ''}
            onChange={(e) => set('source_url', e.target.value || null)}
          />
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-20 z-10 flex gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <Button type="submit" size="lg" className="flex-1 cursor-pointer" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? 'שומרים…' : recipeId ? 'שמירת השינויים' : 'שמירת המתכון'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="cursor-pointer"
          onClick={() => router.back()}
          disabled={pending}
        >
          ביטול
        </Button>
      </div>
    </form>
  )
}

function ImageField({ url, onClear }: { url: string | null; onClear: () => void }) {
  return (
    <div className="space-y-2">
      <Label>תמונה</Label>

      {url ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {/* A plain img: before saving, this URL can point at any host, and
              next/image only serves the ones allowed in next.config.ts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="תצוגה מקדימה של תמונת המתכון" className="h-48 w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-2 end-2 cursor-pointer"
            onClick={onClear}
          >
            <X aria-hidden />
            <span className="sr-only">הסרת התמונה</span>
          </Button>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          <ImageOff className="size-4" aria-hidden />
          אין תמונה
        </div>
      )}
    </div>
  )
}

function VisibilityField({
  isPrivate,
  groupId,
  groups,
  onChange,
}: {
  isPrivate: boolean
  groupId: string | null
  groups: MyGroup[]
  onChange: (isPrivate: boolean, groupId: string | null) => void
}) {
  const value = isPrivate ? 'private' : (groupId ?? '')

  return (
    <div className="space-y-2">
      <Label htmlFor="visibility" className="sr-only">
        נראות
      </Label>

      <NativeSelect
        id="visibility"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (next === 'private') onChange(true, null)
          else onChange(false, next)
        }}
      >
        <option value="private">רק אני</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            משותף עם {group.name}
          </option>
        ))}
      </NativeSelect>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          כדי לשתף מתכון צריך להיות עורך או מנהל בקבוצה כלשהי.
        </p>
      ) : null}
    </div>
  )
}
