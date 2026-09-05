'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, Check, Loader2, Plus, Trash2, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { MENU_CATEGORIES } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { MenuItem } from '@/lib/types'

export type BoardItem = MenuItem & {
  assigneeName: string | null
  recipeTitle: string | null
}

export type MenuMember = { id: string; name: string }
export type LinkableRecipe = { id: string; title: string }

const OTHER = '__other__'

export function MenuBoard({
  menuId,
  items,
  members,
  recipes,
  canEdit,
}: {
  menuId: string
  items: BoardItem[]
  members: MenuMember[]
  recipes: LinkableRecipe[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Known courses first, then anything the user typed in themselves.
  const categories = [
    ...MENU_CATEGORIES.filter((c) => items.some((i) => i.category === c)),
    ...Array.from(new Set(items.map((i) => i.category))).filter(
      (c) => !MENU_CATEGORIES.includes(c),
    ),
  ]

  async function toggleDone(item: BoardItem) {
    setBusyId(item.id)
    setError(null)

    const { error: updateError } = await createClient()
      .from('menu_items')
      .update({ is_done: !item.is_done })
      .eq('id', item.id)

    if (updateError) setError('העדכון נכשל.')
    else router.refresh()
    setBusyId(null)
  }

  async function removeItem(item: BoardItem) {
    setBusyId(item.id)
    setError(null)

    const { error: deleteError } = await createClient().from('menu_items').delete().eq('id', item.id)

    if (deleteError) setError('המחיקה נכשלה.')
    else router.refresh()
    setBusyId(null)
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          התפריט עדיין ריק. הוסיפו מנה ראשונה למטה.
        </p>
      ) : (
        categories.map((category) => (
          <section key={category} className="space-y-2">
            <h2 className="font-heading text-lg font-bold">{category}</h2>

            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {items
                .filter((item) => item.category === category)
                .map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 p-3.5 transition-colors duration-200',
                      item.is_done && 'bg-secondary/40',
                    )}
                  >
                    {canEdit ? (
                      <Checkbox
                        checked={item.is_done}
                        onCheckedChange={() => void toggleDone(item)}
                        disabled={busyId === item.id}
                        className="mt-1"
                        aria-label={`סימון "${item.title}" כמוכן`}
                      />
                    ) : item.is_done ? (
                      <Check className="mt-1 size-4 text-primary" aria-label="מוכן" />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className={cn('font-medium', item.is_done && 'text-muted-foreground line-through')}>
                        {item.title}
                      </p>

                      {item.notes ? (
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      ) : null}

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {item.assigneeName ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <UserRound className="size-3.5" aria-hidden />
                            {item.assigneeName}
                          </span>
                        ) : null}

                        {item.recipe_id && item.recipeTitle ? (
                          <Link
                            href={`/recipes/${item.recipe_id}`}
                            className="inline-flex cursor-pointer items-center gap-1 text-primary underline-offset-4 hover:underline"
                          >
                            <BookOpen className="size-3.5" aria-hidden />
                            {item.recipeTitle}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {canEdit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                        disabled={busyId === item.id}
                        onClick={() => void removeItem(item)}
                      >
                        {busyId === item.id ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <Trash2 aria-hidden />
                        )}
                        <span className="sr-only">מחיקת {item.title}</span>
                      </Button>
                    ) : null}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      {canEdit ? (
        <AddItemForm menuId={menuId} members={members} recipes={recipes} nextPosition={items.length} />
      ) : null}
    </div>
  )
}

function AddItemForm({
  menuId,
  members,
  recipes,
  nextPosition,
}: {
  menuId: string
  members: MenuMember[]
  recipes: LinkableRecipe[]
  nextPosition: number
}) {
  const router = useRouter()
  const [category, setCategory] = useState(MENU_CATEGORIES[2])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [assignee, setAssignee] = useState('')
  const [assigneeName, setAssigneeName] = useState('')
  const [recipeId, setRecipeId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const { error: insertError } = await createClient()
      .from('menu_items')
      .insert({
        menu_id: menuId,
        category,
        title: title.trim(),
        notes: notes.trim() || null,
        // An assignee is either a member with an account or just a name —
        // whoever is bringing the dish often has neither.
        assigned_to: assignee && assignee !== OTHER ? assignee : null,
        assigned_name: assignee === OTHER ? assigneeName.trim() || null : null,
        recipe_id: recipeId || null,
        position: nextPosition,
      })

    if (insertError) {
      setError('ההוספה נכשלה. ייתכן שאין לכם הרשאת עריכה בתפריט הזה.')
      setPending(false)
      return
    }

    setTitle('')
    setNotes('')
    setRecipeId('')
    setPending(false)
    router.refresh()
  }

  return (
    <form
      onSubmit={add}
      className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs"
    >
      <h2 className="font-heading text-lg font-bold">הוספת פריט</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-title">שם המנה</Label>
          <Input
            id="item-title"
            required
            maxLength={200}
            placeholder="קוגל ירושלמי"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-category">קטגוריה</Label>
          <NativeSelect
            id="item-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {MENU_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-assignee">מי מביא</Label>
          <NativeSelect
            id="item-assignee"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          >
            <option value="">עדיין לא סוכם</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
            <option value={OTHER}>מישהו אחר…</option>
          </NativeSelect>

          {assignee === OTHER ? (
            <Input
              aria-label="שם האדם שמביא"
              placeholder="דודה רותי"
              value={assigneeName}
              onChange={(event) => setAssigneeName(event.target.value)}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-recipe">קישור למתכון שמור (רשות)</Label>
          <NativeSelect
            id="item-recipe"
            value={recipeId}
            onChange={(event) => setRecipeId(event.target.value)}
          >
            <option value="">ללא מתכון</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="item-notes">הערות</Label>
          <Input
            id="item-notes"
            placeholder="בלי אגוזים"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="cursor-pointer" disabled={pending || !title.trim()}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus data-icon="inline-start" aria-hidden />}
        הוספה לתפריט
      </Button>
    </form>
  )
}
