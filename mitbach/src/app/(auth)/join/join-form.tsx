'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS } from '@/lib/format'
import type { GroupRole } from '@/lib/types'
import type { InviteCheck } from '@/lib/invitations-server'

type CodeCheck =
  | { state: 'idle' | 'checking' }
  | { state: 'valid'; groupName: string | null; role: GroupRole; email: string | null }
  | { state: 'invalid'; error: string }

/** Turns the server's verdict into this component's state shape. */
function toCodeCheck(result: InviteCheck | null): CodeCheck {
  if (!result) return { state: 'idle' }
  return result.valid
    ? { state: 'valid', groupName: result.groupName, role: result.role, email: result.email }
    : { state: 'invalid', error: result.error }
}

export function JoinForm({
  initialCode,
  initialCheck,
}: {
  initialCode: string
  initialCheck: InviteCheck | null
}) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [check, setCheck] = useState<CodeCheck>(() => toCodeCheck(initialCheck))
  const [name, setName] = useState('')
  const [email, setEmail] = useState(
    initialCheck?.valid ? (initialCheck.email ?? '') : '',
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const verify = useCallback(async (value: string) => {
    if (value.trim().length < 6) {
      setCheck({ state: 'idle' })
      return
    }

    setCheck({ state: 'checking' })
    const response = await fetch(`/api/join?code=${encodeURIComponent(value)}`)
    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.valid) {
      setCheck({ state: 'invalid', error: data?.error ?? 'הקוד אינו תקין' })
      return
    }

    setCheck({ state: 'valid', groupName: data.groupName, role: data.role, email: data.email })
    // An invitation addressed to one person can only be redeemed by them, so
    // filling the field in saves a rejection they cannot do anything about.
    if (data.email) setEmail((current) => current || data.email)
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const response = await fetch('/api/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, name, email, password }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? 'ההצטרפות נכשלה.')
      setPending(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // The account exists — only the automatic sign-in failed.
      router.push('/login')
      return
    }

    router.refresh()
    router.push('/')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>הצטרפות למטבח</CardTitle>
        <CardDescription>
          ההרשמה היא בהזמנה בלבד. הזינו את הקוד שקיבלתם.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="code">קוד הזמנה</Label>
            <Input
              id="code"
              required
              dir="ltr"
              className="field-ltr font-mono tracking-wider"
              placeholder="MTB-XXXX-XXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setCheck({ state: 'idle' })
              }}
              onBlur={(e) => void verify(e.target.value)}
              aria-describedby="code-status"
            />

            <p id="code-status" aria-live="polite" className="min-h-5 text-sm">
              {check.state === 'checking' ? (
                <span className="text-muted-foreground">בודקים את הקוד…</span>
              ) : check.state === 'invalid' ? (
                <span className="font-medium text-destructive">{check.error}</span>
              ) : check.state === 'valid' ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                  <CheckCircle2 className="size-4" aria-hidden />
                  {check.groupName
                    ? `הזמנה לקבוצה "${check.groupName}" בתור ${ROLE_LABELS[check.role]}`
                    : 'ההזמנה תקפה'}
                </span>
              ) : null}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">השם שלכם</Label>
            <Input
              id="name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              className="field-ltr"
              required
              readOnly={check.state === 'valid' && Boolean(check.email)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {check.state === 'valid' && check.email ? (
              <p className="text-xs text-muted-foreground">
                ההזמנה הונפקה לכתובת הזו ואי אפשר לשנות אותה.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              className="field-ltr"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              לפחות 8 תווים.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={pending || check.state === 'invalid'}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {pending ? 'מצטרפים…' : 'יצירת חשבון'}
          </Button>
        </form>
      </CardContent>

      <CardContent className="pt-0">
        <p className="text-center text-sm text-muted-foreground">
          כבר יש לכם חשבון?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            כניסה
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
