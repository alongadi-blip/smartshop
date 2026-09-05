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
import { NativeSelect } from '@/components/ui/native-select'
import { createClient } from '@/lib/supabase/client'
import type { MyGroup } from '@/lib/queries'

export function CreateMenu({ groups }: { groups: MyGroup[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editable = groups.filter((g) => g.role === 'admin' || g.role === 'editor')

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

    const isPrivate = visibility === 'private'

    const { data, error: insertError } = await supabase
      .from('menus')
      .insert({
        title: title.trim(),
        event_date: eventDate || null,
        is_private: isPrivate,
        group_id: isPrivate ? null : visibility,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError || !data) {
      setError('יצירת התפריט נכשלה.')
      setPending(false)
      return
    }

    setOpen(false)
    setTitle('')
    setEventDate('')
    setPending(false)
    router.push(`/menus/${data.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="cursor-pointer">
            <Plus data-icon="inline-start" aria-hidden />
            תפריט חדש
          </Button>
        }
      />

      <DialogContent>
        <form onSubmit={create}>
          <DialogHeader>
            <DialogTitle>תפריט חדש</DialogTitle>
            <DialogDescription>
              תפריט עומד בפני עצמו — אין צורך שהמנות שבו יהיו מתכונים שמורים.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="menu-title">שם האירוע</Label>
              <Input
                id="menu-title"
                required
                maxLength={200}
                placeholder="ליל הסדר אצל סבתא"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-date">תאריך (רשות)</Label>
              <Input
                id="menu-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-visibility">מי רואה את התפריט</Label>
              <NativeSelect
                id="menu-visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
              >
                <option value="private">רק אני</option>
                {editable.map((group) => (
                  <option key={group.id} value={group.id}>
                    משותף עם {group.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                תפריט משותף מאפשר לכל חברי הקבוצה לראות מי מביא מה.
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" className="cursor-pointer" disabled={pending || !title.trim()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              יצירה
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
