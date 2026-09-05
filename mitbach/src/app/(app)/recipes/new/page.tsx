import type { Metadata } from 'next'

import { AddRecipe } from './add-recipe'
import { getMyGroups } from '@/lib/queries'

export const metadata: Metadata = { title: 'מתכון חדש · מטבח' }

export default async function NewRecipePage() {
  const groups = await getMyGroups()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">מתכון חדש</h1>
        <p className="text-sm text-muted-foreground">
          הדביקו קישור, הדביקו טקסט, או הזינו הכול ידנית.
        </p>
      </div>

      <AddRecipe groups={groups} />
    </div>
  )
}
