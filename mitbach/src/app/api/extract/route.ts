import { NextResponse } from 'next/server'
import { z } from 'zod'

import { extractFromText, extractFromUrl, FetchPageError } from '@/lib/extract'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/rate-limit'

const bodySchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).max(60_000).optional(),
  })
  .refine((b) => Boolean(b.url) !== Boolean(b.text), {
    message: 'שלחו קישור או טקסט — לא את שניהם',
  })

/**
 * POST /api/extract — turns a link or a block of text into a draft recipe.
 * Nothing is written here; the client reviews the result and saves it itself.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'לא מחוברים' }, { status: 401 })

  // The LLM half of extraction costs money per call, so the budget is per user
  // rather than per IP — a shared household address should not throttle itself.
  if (isRateLimited(`extract:${user.id}`, 40, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'הגעתם למכסת החילוצים לשעה. אפשר להזין מתכון ידנית בינתיים.' },
      { status: 429 },
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'קלט לא תקין' }, { status: 400 })
  }

  try {
    const result = parsed.data.url
      ? await extractFromUrl(normalizeUrl(parsed.data.url))
      : await extractFromText(parsed.data.text!)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FetchPageError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('[extract] unexpected failure', error)
    return NextResponse.json({ error: 'החילוץ נכשל. נסו שוב.' }, { status: 500 })
  }
}

/** People paste "example.com/recipe" without a scheme far more often than not. */
function normalizeUrl(input: string) {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`
}
