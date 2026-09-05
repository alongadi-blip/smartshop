import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeInviteCode } from '@/lib/invites'
import type { GroupRole } from '@/lib/types'

export const INVALID_INVITE = 'קוד ההזמנה אינו תקין, כבר נוצל או שפג תוקפו.'

export type InviteCheck =
  | { valid: true; role: GroupRole; email: string | null; groupName: string | null }
  | { valid: false; error: string }

/**
 * Looks a code up as the service role, because the invitee has no session yet
 * and the invitations table is closed to anon.
 *
 * Shared by the join API route and the join page, so a link that already
 * carries ?code= is resolved during the server render instead of costing the
 * browser a round trip after mount.
 */
export async function checkInvitationCode(raw: string): Promise<InviteCheck> {
  const code = normalizeInviteCode(raw)

  const { data } = await createAdminClient()
    .from('invitations')
    .select('role, email, group_id, expires_at, status, groups(name)')
    .eq('code', code)
    .maybeSingle()

  if (!data || data.status !== 'pending' || new Date(data.expires_at) <= new Date()) {
    return { valid: false, error: INVALID_INVITE }
  }

  // PostgREST types an embedded one-to-one as an array; normalise it.
  const embedded = data.groups as unknown as { name: string }[] | { name: string } | null
  const group = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded

  return {
    valid: true,
    role: data.role as GroupRole,
    email: data.email,
    groupName: group?.name ?? null,
  }
}
