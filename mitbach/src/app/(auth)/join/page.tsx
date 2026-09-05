import type { Metadata } from 'next'

import { JoinForm } from './join-form'
import { checkInvitationCode, type InviteCheck } from '@/lib/invitations-server'

export const metadata: Metadata = { title: 'הצטרפות · מטבח' }

export default async function JoinPage({ searchParams }: PageProps<'/join'>) {
  const params = await searchParams
  const code = typeof params.code === 'string' ? params.code : ''

  // Resolved here rather than in the browser, so a link that already carries
  // the code shows the group name in the first paint.
  let initialCheck: InviteCheck | null = null
  if (code.trim().length >= 6) {
    initialCheck = await checkInvitationCode(code).catch(() => null)
  }

  return <JoinForm initialCode={code} initialCheck={initialCheck} />
}
