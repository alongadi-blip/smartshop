'use client'

import { useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { Ingredient } from '@/lib/types'

/**
 * Ticking ingredients off is what people actually do while cooking. The state
 * is deliberately local and unsaved — it belongs to this cooking session, not
 * to the recipe.
 */
export function IngredientChecklist({ ingredients }: { ingredients: Ingredient[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(index: number) {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <ul className="space-y-1">
      {ingredients.map((ingredient, index) => {
        const isChecked = checked.has(index)
        const id = `ingredient-${index}`

        return (
          <li key={index}>
            <label
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-secondary/60',
                isChecked && 'text-muted-foreground',
              )}
            >
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={() => toggle(index)}
                className="mt-0.5"
              />

              <span className={cn('leading-snug', isChecked && 'line-through')}>
                {ingredient.quantity || ingredient.unit ? (
                  <span className="font-semibold">
                    <span className="ltr-nums">{ingredient.quantity}</span>
                    {ingredient.quantity && ingredient.unit ? ' ' : null}
                    {ingredient.unit}{' '}
                  </span>
                ) : null}
                {ingredient.item}
                {ingredient.note ? (
                  <span className="text-muted-foreground"> ({ingredient.note})</span>
                ) : null}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
