'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Copy, Loader2, UserPlus } from 'lucide-react'

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
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/format'
import type { GroupRole } from '@/lib/types'

/**
 * Mints an invitation. Passing a groupId makes it a group invitation, which
 * the API will only accept from an admin of that group; without one it just
 * grants access to the app.
 */
export function InviteDialog({
  groupId,
  groupName,
  label = 'הזמנת חבר',
}: {
  groupId?: string
  groupName?: string
  label?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<GroupRole>('editor')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<{ code: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function create() {
    setPending(true)
    setError(null)

    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        groupId: groupId ?? null,
        role,
        email: email.trim() || null,
        note: note.trim() || null,
      }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? 'יצירת ההזמנה נכשלה.')
      setPending(false)
      return
    }

    setInvite({ code: data.invitation.code, url: data.url })
    setPending(false)
    router.refresh()
  }

  async function copy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('ההעתקה נכשלה. סמנו את הקישור והעתיקו ידנית.')
    }
  }

  function reset(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setInvite(null)
      setEmail('')
      setNote('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger
        render={
          <Button variant={groupId ? 'default' : 'outline'} className="cursor-pointer">
            <UserPlus data-icon="inline-start" aria-hidden />
            {label}
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{groupName ? `הזמנה לקבוצה ${groupName}` : 'הזמנה למטבח'}</DialogTitle>
          <DialogDescription>
            {invite
              ? 'שלחו את הקישור לאדם שרוצים לצרף. הקוד תקף לשימוש אחד בלבד.'
              : 'ההרשמה למערכת אפשרית רק דרך קוד הזמנה שמישהו קיים הנפיק.'}
          </DialogDescription>
        </DialogHeader>

        {invite ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-center">
              <p className="font-mono text-lg font-bold tracking-wider" dir="ltr">
                {invite.code}
              </p>
            </div>

            <div className="flex gap-2">
              <Input readOnly dir="ltr" className="field-ltr text-xs" value={invite.url} />
              <Button type="button" variant="outline" className="cursor-pointer" onClick={copy}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                <span className="sr-only">העתקת הקישור</span>
              </Button>
            </div>

            {copied ? <p className="text-sm text-primary">הקישור הועתק.</p> : null}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {groupId ? (
              <div className="space-y-2">
                <Label htmlFor="invite-role">הרשאה בקבוצה</Label>
                <NativeSelect
                  id="invite-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as GroupRole)}
                >
                  {(['viewer', 'editor', 'admin'] as const).map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </NativeSelect>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="invite-email">נעילה לכתובת אימייל (רשות)</Label>
              <Input
                id="invite-email"
                type="email"
                dir="ltr"
                className="field-ltr"
                placeholder="dana@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                אם תמלאו — רק הכתובת הזו תוכל לממש את הקוד.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-note">תזכורת לעצמכם (רשות)</Label>
              <Input
                id="invite-note"
                maxLength={200}
                placeholder="דודה רותי"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {invite ? (
            <Button type="button" className="cursor-pointer" onClick={() => reset(false)}>
              סיום
            </Button>
          ) : (
            <Button type="button" className="cursor-pointer" onClick={create} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              יצירת קוד
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
