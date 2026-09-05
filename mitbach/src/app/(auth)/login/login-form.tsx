'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('האימייל או הסיסמה אינם נכונים.')
      setPending(false)
      return
    }

    // refresh() so the server components re-render with the new session before
    // the navigation lands, otherwise the proxy bounces us straight back here.
    router.refresh()
    router.push(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>כניסה</CardTitle>
        <CardDescription>ברוכים השבים למטבח.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              className="field-ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full cursor-pointer" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {pending ? 'נכנסים…' : 'כניסה'}
          </Button>
        </form>
      </CardContent>

      <CardContent className="pt-0">
        <p className="text-center text-sm text-muted-foreground">
          יש לכם קוד הזמנה?{' '}
          <Link href="/join" className="font-medium text-primary underline-offset-4 hover:underline">
            הצטרפו כאן
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
