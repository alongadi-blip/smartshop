import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeInviteCode } from '@/lib/invites'
import { checkInvitationCode, INVALID_INVITE } from '@/lib/invitations-server'
import { clientIp, isRateLimited } from '@/lib/rate-limit'



/**
 * GET /api/join?code=MTB-XXXX-XXXX
 * Tells the join screen whether a code is live, and which group it leads to,
 * without leaking anything else about the invitation.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('code')
  if (!raw) return NextResponse.json({ valid: false, error: INVALID_INVITE }, { status: 400 })

  if (isRateLimited(`join-check:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ valid: false, error: 'יותר מדי ניסיונות. נסו שוב בעוד דקה.' }, { status: 429 })
  }

  const result = await checkInvitationCode(raw)
  return NextResponse.json(result, { status: result.valid ? 200 : 404 })
}

const redeemSchema = z.object({
  code: z.string().min(6),
  email: z.email('כתובת אימייל לא תקינה'),
  password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
  name: z.string().trim().min(1, 'צריך שם').max(80),
})

/**
 * POST /api/join — the only way an account is ever created.
 *
 * The invitation is claimed first with a conditional update, so two people
 * racing on the same code cannot both get an account out of it. If account
 * creation then fails, the claim is released.
 */
export async function POST(request: NextRequest) {
  if (isRateLimited(`join:${clientIp(request)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות הרשמה. נסו שוב מאוחר יותר.' }, { status: 429 })
  }

  const parsed = redeemSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'קלט לא תקין' }, { status: 400 })
  }

  const { email, password, name } = parsed.data
  const code = normalizeInviteCode(parsed.data.code)
  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('invitations')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('code', code)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .select('id, group_id, role, email')
    .maybeSingle()

  if (!invitation) {
    return NextResponse.json({ error: INVALID_INVITE }, { status: 400 })
  }

  const release = async () => {
    await admin
      .from('invitations')
      .update({ status: 'pending', used_at: null })
      .eq('id', invitation.id)
  }

  // An invitation addressed to a specific person may only be used by them.
  if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
    await release()
    return NextResponse.json(
      { error: `ההזמנה הזו הונפקה עבור ${invitation.email}.` },
      { status: 403 },
    )
  }

  // Invite-only access already establishes that the address is trusted, so the
  // account is confirmed on creation rather than by a verification email.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !created.user) {
    await release()
    const alreadyExists = createError?.message?.toLowerCase().includes('already')
    return NextResponse.json(
      { error: alreadyExists ? 'כבר קיים חשבון עם האימייל הזה. אפשר פשוט להתחבר.' : 'יצירת החשבון נכשלה.' },
      { status: 400 },
    )
  }

  const userId = created.user.id
  await admin.from('invitations').update({ used_by: userId }).eq('id', invitation.id)

  if (invitation.group_id) {
    const { error: memberError } = await admin
      .from('group_members')
      .insert({ group_id: invitation.group_id, user_id: userId, role: invitation.role })

    // The account exists either way; joining the group is recoverable, so this
    // is reported rather than rolled back.
    if (memberError) {
      return NextResponse.json({
        ok: true,
        warning: 'החשבון נוצר, אבל ההצטרפות לקבוצה נכשלה. בקשו מהמנהל הזמנה נוספת.',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
