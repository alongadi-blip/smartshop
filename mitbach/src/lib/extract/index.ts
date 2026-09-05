import 'server-only'

import * as cheerio from 'cheerio'

import type { ExtractedRecipe, ExtractionResult } from '@/lib/types'
import { fetchPage, FetchPageError } from './fetch-page'
import { extractWithClaude, llmAvailable } from './llm'
import { siteNameForUrl, sourceTypeForUrl } from './parse-helpers'
import { emptyRecipe, fromJsonLd, fromMicrodata, fromOpenGraph, readableText } from './structured'

export { FetchPageError }

const isUsable = (recipe: ExtractedRecipe) =>
  recipe.ingredients.length > 0 || recipe.instructions.length > 0

/** Relative og:image paths are common; the review screen needs an absolute URL. */
function absolutize(imageUrl: string | null, base: string): string | null {
  if (!imageUrl) return null
  try {
    const resolved = new URL(imageUrl, base)
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.toString() : null
  } catch {
    return null
  }
}

/**
 * URL → recipe, cheapest path first.
 *
 * Order matters: structured data is free, exact, and available on most real
 * recipe sites, so the model only ever sees pages that path could not read.
 */
export async function extractFromUrl(rawUrl: string): Promise<ExtractionResult> {
  const page = await fetchPage(rawUrl)
  const $ = cheerio.load(page.html)
  const url = page.finalUrl

  const og = fromOpenGraph($, url)

  for (const [method, candidate] of [
    ['json-ld', fromJsonLd($, url)],
    ['microdata', fromMicrodata($, url)],
  ] as const) {
    if (candidate && isUsable(candidate)) {
      return {
        recipe: {
          ...candidate,
          title: candidate.title || og.title,
          description: candidate.description ?? og.description,
          image_url: absolutize(candidate.image_url ?? og.image_url, url),
          source_name: og.source_name ?? siteNameForUrl(url),
        },
        method,
        warning: null,
      }
    }
  }

  const text = readableText($)

  if (llmAvailable()) {
    const result = await extractWithClaude(text, { sourceUrl: url, ogTitle: og.title })

    if (result?.isRecipe && (result.recipe.ingredients?.length || result.recipe.instructions?.length)) {
      return {
        recipe: {
          ...og,
          ...result.recipe,
          title: result.recipe.title || og.title,
          description: result.recipe.description ?? og.description,
          image_url: absolutize(og.image_url, url),
        } as ExtractedRecipe,
        method: 'llm',
        warning: null,
      }
    }

    if (result && !result.isRecipe) {
      return {
        recipe: { ...og, image_url: absolutize(og.image_url, url) },
        method: 'opengraph',
        warning: socialWall(url) ?? 'לא זוהה מתכון בעמוד הזה. אפשר להשלים ידנית, או להדביק את הטקסט בלשונית "טקסט חופשי".',
      }
    }
  }

  return {
    recipe: { ...og, image_url: absolutize(og.image_url, url) },
    method: og.title ? 'opengraph' : 'empty',
    warning:
      socialWall(url) ??
      (llmAvailable()
        ? 'לא הצלחנו לקרוא את המתכון מהעמוד. השלימו ידנית, או הדביקו את הטקסט בלשונית "טקסט חופשי".'
        : 'בעמוד הזה אין נתוני מתכון מובנים, ומפתח Claude API לא הוגדר — לכן החילוץ החכם כבוי. השלימו ידנית או הגדירו ANTHROPIC_API_KEY.'),
  }
}

/**
 * Instagram and Facebook serve a login wall to anything without a session, so
 * a link alone usually yields only the cover image. Say so plainly instead of
 * letting the user think the extraction is broken.
 */
function socialWall(url: string): string | null {
  const type = sourceTypeForUrl(url)
  if (type === 'instagram' || type === 'facebook' || type === 'tiktok') {
    const name = { instagram: 'אינסטגרם', facebook: 'פייסבוק', tiktok: 'טיקטוק' }[type]
    return `${name} חוסמת קריאה אוטומטית של פוסטים, ולכן קיבלנו רק את התמונה והכיתוב החלקי. העתיקו את הכיתוב המלא של הפוסט והדביקו אותו בלשונית "טקסט חופשי" — משם החילוץ עובד מצוין.`
  }
  return null
}

/** Pasted text — a social caption, a screenshot transcription, a WhatsApp forward. */
export async function extractFromText(text: string): Promise<ExtractionResult> {
  const base = emptyRecipe(null)

  if (!llmAvailable()) {
    return {
      recipe: base,
      method: 'empty',
      warning: 'חילוץ מטקסט חופשי דורש מפתח Claude API. הגדירו ANTHROPIC_API_KEY, או הזינו את המתכון ידנית.',
    }
  }

  const result = await extractWithClaude(text, {})

  if (!result) {
    return {
      recipe: base,
      method: 'empty',
      warning: 'החילוץ נכשל. נסו שוב, או הזינו את המתכון ידנית.',
    }
  }

  if (!result.isRecipe) {
    return {
      recipe: base,
      method: 'empty',
      warning: 'לא זוהה מתכון בטקסט הזה. ודאו שהודבקו המצרכים והוראות ההכנה.',
    }
  }

  return {
    recipe: { ...base, ...result.recipe, source_type: 'text' } as ExtractedRecipe,
    method: 'llm',
    warning: null,
  }
}
