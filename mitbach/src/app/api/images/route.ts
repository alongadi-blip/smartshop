import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { fetchRemoteImage, FetchPageError } from '@/lib/extract/fetch-page'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/rate-limit'

const bodySchema = z.object({ imageUrl: z.url() })

/**
 * POST /api/images — copies a scraped cover image into our own bucket.
 *
 * The upload runs under the caller's session, so the storage policy is what
 * keeps everyone inside their own {user_id}/ folder.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'לא מחוברים' }, { status: 401 })

  if (isRateLimited(`image:${user.id}`, 60, 60 * 60_000)) {
    return NextResponse.json({ error: 'יותר מדי העלאות תמונה. נסו שוב בעוד שעה.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'כתובת תמונה לא תקינה' }, { status: 400 })
  }

  try {
    const image = await fetchRemoteImage(parsed.data.imageUrl)
    const path = `${user.id}/${randomUUID()}.${image.extension}`

    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(path, image.bytes, { contentType: image.contentType, upsert: false })

    if (error) {
      console.error('[images] upload failed', error)
      return NextResponse.json({ error: 'שמירת התמונה נכשלה' }, { status: 500 })
    }

    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, path })
  } catch (error) {
    if (error instanceof FetchPageError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('[images] unexpected failure', error)
    return NextResponse.json({ error: 'שמירת התמונה נכשלה' }, { status: 500 })
  }
}
