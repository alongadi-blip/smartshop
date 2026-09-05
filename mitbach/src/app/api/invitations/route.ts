import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { generateInviteCode, inviteUrl } from '@/lib/invites'


const createSchema = z.object({
  groupId: z.uuid().nullish(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  email: z.email().nullish(),
  note: z.string().max(200).nullish(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
})

/**
 * POST /api/invitations — mint a code.
 *
 * This runs under the caller's own session, so the insert policy is what
 * enforces that only a group admin can issue an invitation into a group.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'לא מחוברים' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'קלט לא תקין' }, { status: 400 })
  }

  const { groupId, role, email, note, expiresInDays } = parsed.data
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString()

  // Codes are random, so a collision is vanishingly unlikely — but the column
  // is unique, and retrying is cheaper than explaining a 500.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        code,
        created_by: user.id,
        group_id: groupId ?? null,
        role,
        email: email ?? null,
        note: note ?? null,
        expires_at: expiresAt,
      })
      .select('id, code, role, email, note, expires_at, group_id, status, created_at')
      .single()

    if (!error && data) {
      return NextResponse.json({ invitation: data, url: inviteUrl(data.code) })
    }

    if (error?.code !== '23505') {
      const forbidden = error?.code === '42501'
      return NextResponse.json(
        { error: forbidden ? 'רק מנהל קבוצה יכול להזמין אליה' : 'יצירת ההזמנה נכשלה' },
        { status: forbidden ? 403 : 400 },
      )
    }
  }

  return NextResponse.json({ error: 'יצירת ההזמנה נכשלה. נסו שוב.' }, { status: 500 })
}
