'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter()

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || '?'

  async function signOut() {
    await createClient().auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="size-10 cursor-pointer rounded-full">
            <span className="sr-only">תפריט משתמש</span>
            <Avatar className="size-9">
              <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{name}</span>
          <span dir="ltr" className="truncate text-start text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={signOut}>
          <LogOut aria-hidden />
          יציאה
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
