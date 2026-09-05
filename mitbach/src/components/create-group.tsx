'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

export function CreateGroup() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('פג תוקף החיבור. התחברו מחדש.')
      setPending(false)
      return
    }

    // A trigger adds the owner as the group's first admin.
    const { data, error: insertError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, owner_id: user.id })
      .select('id')
      .single()

    if (insertError || !data) {
      setError('יצירת הקבוצה נכשלה.')
      setPending(false)
      return
    }

    setOpen(false)
    setName('')
    setDescription('')
    setPending(false)
    router.push(`/groups/${data.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer">
            <Plus data-icon="inline-start" aria-hidden />
            קבוצה חדשה
          </Button>
        }
      />

      <DialogContent>
        <form onSubmit={create}>
          <DialogHeader>
            <DialogTitle>קבוצה חדשה</DialogTitle>
            <DialogDescription>
              קבוצה היא מי שרואה את המתכונים והתפריטים המשותפים — משפחה, חברים, כל חבורה.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">שם הקבוצה</Label>
              <Input
                id="group-name"
                required
                maxLength={80}
                placeholder="משפחה מורחבת"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">תיאור (רשות)</Label>
              <Textarea
                id="group-description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              יצירה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
