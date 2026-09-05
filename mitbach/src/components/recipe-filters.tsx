'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { MyGroup } from '@/lib/queries'

export function RecipeFilters({ groups }: { groups: MyGroup[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const scope = searchParams.get('scope') ?? 'all'
  const tag = searchParams.get('tag')
  const [term, setTerm] = useState(searchParams.get('q') ?? '')

  function apply(next: URLSearchParams) {
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname))
  }

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (term === current) return

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (term.trim()) next.set('q', term.trim())
      else next.delete('q')
      apply(next)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, searchParams])

  function setScope(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('scope')
    else next.set('scope', value)
    apply(next)
  }

  function clearTag() {
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    apply(next)
  }

  const chips = [
    { value: 'all', label: 'הכול' },
    { value: 'mine', label: 'הפרטיים שלי' },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ]

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="חיפוש מתכון…"
          aria-label="חיפוש מתכון"
          className="h-11 ps-9 pe-9"
        />
        {pending ? (
          <Loader2
            aria-hidden
            className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setScope(chip.value)}
            aria-pressed={scope === chip.value}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm font-medium transition-colors duration-200',
              scope === chip.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {chip.label}
          </button>
        ))}

        {tag ? (
          <button
            type="button"
            onClick={clearTag}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-accent bg-accent/15 px-3.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent/25"
          >
            {tag}
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">הסרת סינון לפי תגית</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
