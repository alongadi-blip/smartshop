'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, Plus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'מתכונים', icon: BookOpen },
  { href: '/menus', label: 'תפריטים', icon: CalendarDays },
  { href: '/groups', label: 'קבוצות', icon: Users },
] as const

function useActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
}

/** Inline links, shown from `md` up. */
export function DesktopNav() {
  const isActive = useActive()

  return (
    <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 md:flex">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
            isActive(href)
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}

/**
 * Bottom tab bar for phones. The add button sits in the middle of the bar
 * because that is where a thumb already is.
 */
export function MobileNav() {
  const isActive = useActive()
  const [recipes, menus, groups] = LINKS

  const tabs = [recipes, menus, null, groups] as const

  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {tabs.map((link) =>
          link === null ? (
            <li key="add" className="flex flex-1 items-center justify-center">
              <Link
                href="/recipes/new"
                className="grid size-12 cursor-pointer place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-colors duration-200 hover:bg-primary/90"
              >
                <Plus className="size-6" aria-hidden />
                <span className="sr-only">הוספת מתכון</span>
              </Link>
            </li>
          ) : (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors duration-200',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <link.icon className="size-5" aria-hidden />
                {link.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
