import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Reachable without a session. Everything else redirects to /login.
 *
 * /api/join has to be here: it is how an account comes into existence, so by
 * definition its callers have no session yet. It does its own rate limiting
 * and only ever acts on a valid, unredeemed invitation code.
 */
const PUBLIC_PATHS = ['/login', '/join', '/auth', '/api/auth', '/api/join']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Refreshes an expiring token and writes the rotated cookies onto `response`.
  // Do not put anything between createServerClient and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    // An API caller wants a status code, not a login page — a redirect here
    // turns a clean 401 into an HTML body that fails to parse as JSON.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'לא מחוברים' }, { status: 401 })
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // So the user lands back where they were aiming after signing in.
    if (pathname !== '/') url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/join')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
