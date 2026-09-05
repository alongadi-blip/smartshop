import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Request-scoped client that reads the caller's session. Subject to RLS. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  )
}

/**
 * The signed-in user, verified against the auth server.
 * Never trust getSession() here — its cookie is not re-validated.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}
