import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Brand } from '@/components/brand'
import { DesktopNav, MobileNav } from '@/components/main-nav'
import { UserMenu } from '@/components/user-menu'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The proxy already turns anonymous requests away; this is the guard that
  // actually protects the data, since a proxy can be bypassed by a rewrite.
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle()

  const name = profile?.name ?? user.email?.split('@')[0] ?? 'משתמש'

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="cursor-pointer">
            <Brand size="sm" />
            <span className="sr-only">לדף הבית</span>
          </Link>

          <div className="flex-1" />

          <DesktopNav />

          <Button
            render={<Link href="/recipes/new" />}
            className="hidden cursor-pointer md:inline-flex"
          >
            <Plus data-icon="inline-start" aria-hidden />
            מתכון חדש
          </Button>

          <UserMenu name={name} email={profile?.email ?? user.email ?? ''} />
        </div>
      </header>

      {/* pb-24 keeps the last row clear of the mobile tab bar. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-12">{children}</main>

      <MobileNav />
    </>
  )
}
