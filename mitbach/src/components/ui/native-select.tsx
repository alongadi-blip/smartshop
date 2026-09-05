import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A native <select> dressed to match the shadcn inputs.
 *
 * Deliberately not the Base UI Select: every picker here is a short, static
 * list, and the platform control gives us the phone's native wheel, correct
 * RTL behaviour and keyboard support for free.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-transparent ps-3 pe-9 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
