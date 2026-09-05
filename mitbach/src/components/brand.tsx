import { CookingPot } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Brand({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const mark = { sm: 'size-8', md: 'size-10', lg: 'size-14' }[size]
  const icon = { sm: 'size-4', md: 'size-5', lg: 'size-7' }[size]
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }[size]

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm',
          mark,
        )}
      >
        <CookingPot className={icon} aria-hidden />
      </span>
      <span className={cn('font-heading font-bold tracking-tight', text)}>מטבח</span>
    </span>
  )
}
