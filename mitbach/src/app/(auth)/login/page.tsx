import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'כניסה · מטבח' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const requested = typeof params.next === 'string' ? params.next : '/'

  // `next` arrives from the URL, so only same-site paths are honoured —
  // "//evil.example" is a valid relative-looking URL that leaves the site.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/'

  return <LoginForm next={next} />
}
