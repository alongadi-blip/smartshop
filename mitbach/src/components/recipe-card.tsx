import Image from 'next/image'
import Link from 'next/link'
import { Clock, ImageOff, Lock, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatMinutes, totalMinutes } from '@/lib/format'
import type { Recipe } from '@/lib/types'

export type RecipeCardData = Pick<
  Recipe,
  'id' | 'title' | 'image_url' | 'description' | 'prep_minutes' | 'cook_minutes' | 'is_private' | 'tags'
> & { groupName?: string | null }

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const time = formatMinutes(totalMinutes(recipe.prep_minutes, recipe.cook_minutes))

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-colors duration-200 hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-opacity duration-200 group-hover:opacity-90"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}

        <div className="absolute top-2 end-2 flex gap-1.5">
          {recipe.is_private ? (
            <Badge className="gap-1 bg-background/90 text-foreground backdrop-blur">
              <Lock className="size-3" aria-hidden />
              פרטי
            </Badge>
          ) : recipe.groupName ? (
            <Badge className="gap-1 bg-background/90 text-foreground backdrop-blur">
              <Users className="size-3" aria-hidden />
              {recipe.groupName}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-heading text-lg leading-snug font-bold text-balance">{recipe.title}</h3>

        {recipe.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
          {time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              <span className="ltr-nums">{time}</span>
            </span>
          ) : null}

          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
