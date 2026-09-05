'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

/** Shared confirm-then-delete for recipes, menus and groups. */
export function DeleteButton({
  table,
  id,
  redirectTo,
  title,
  description,
  label = 'מחיקה',
}: {
  table: 'recipes' | 'menus' | 'groups' | 'menu_items'
  id: string
  redirectTo?: string
  title: string
  description: string
  label?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setPending(true)
    setError(null)

    const { error: deleteError } = await createClient().from(table).delete().eq('id', id)

    if (deleteError) {
      setError('המחיקה נכשלה — ייתכן שאין לכם הרשאה.')
      setPending(false)
      return
    }

    if (redirectTo) router.push(redirectTo)
    router.refresh()
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" className="cursor-pointer text-destructive">
            <Trash2 data-icon="inline-start" aria-hidden />
            {label}
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="cursor-pointer">ביטול</Button>} />
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={remove}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            מחיקה סופית
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
