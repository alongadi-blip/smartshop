import { createClient } from '@/lib/supabase/server'
import type { GroupRole } from '@/lib/types'

export type MyGroup = { id: string; name: string; role: GroupRole; owner_id: string }

/**
 * The groups the signed-in user belongs to, with their role in each.
 * RLS already limits the roster to groups they are a member of.
 */
export async function getMyGroups(): Promise<MyGroup[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('group_members')
    .select('role, groups(id, name, owner_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (data ?? [])
    .map((row) => {
      const group = row.groups as unknown as { id: string; name: string; owner_id: string } | null
      return group ? { ...group, role: row.role as GroupRole } : null
    })
    .filter((g): g is MyGroup => g !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

export function canEdit(role: GroupRole | null | undefined) {
  return role === 'admin' || role === 'editor'
}
