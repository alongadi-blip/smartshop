import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only two flows need it, and both are gated on a valid invitation code:
 *   * reading a pending invitation before the invitee has an account;
 *   * creating that account and its first group membership.
 *
 * Every other query goes through the request-scoped client in ./server.ts so
 * that the policies actually run.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — invitations cannot be redeemed')
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
