import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon className="size-6" aria-hidden />
      </span>

      <h2 className="font-heading text-lg font-bold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>

      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
