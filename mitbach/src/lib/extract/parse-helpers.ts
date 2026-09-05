import type { Ingredient, RecipeSource } from '@/lib/types'

/** "PT1H30M" → 90. Recipe sites emit ISO 8601 durations for prep/cook time. */
export function isoDurationToMinutes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?)?$/i)
  if (!match) {
    // Some sites just write "45" or "45 min".
    const loose = value.match(/(\d+)/)
    return loose ? Number(loose[1]) : null
  }

  const [, days, hours, minutes] = match
  const total = Number(days ?? 0) * 1440 + Number(hours ?? 0) * 60 + Number(minutes ?? 0)
  return total > 0 ? total : null
}

const VULGAR: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

const UNITS = [
  'כוסות', 'כוס', 'כפות', 'כף', 'כפיות', 'כפית', 'גרם', 'ק"ג', 'קילו', 'קילוגרם',
  'מ"ל', 'מל', 'ליטר', 'יחידות', 'יחידה', 'חבילות', 'חבילה', 'שקית', 'שקיות',
  'קורט', 'צרור', 'קופסה', 'קופסאות', 'פרוסות', 'פרוסה', 'שיני', 'שן',
  'cups', 'cup', 'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
  'grams', 'gram', 'g', 'kg', 'ml', 'l', 'oz', 'ounces', 'lb', 'pounds', 'pinch', 'cloves', 'clove',
]

/**
 * Splits "2 כוסות קמח מלא" into quantity / unit / item.
 *
 * This is deliberately forgiving: an ingredient that does not split cleanly
 * keeps its whole text as the item, which still reads correctly on screen and
 * stays editable in the review form.
 */
export function parseIngredientLine(raw: string): Ingredient | null {
  let line = raw.trim().replace(/\s+/g, ' ')
  if (!line) return null

  for (const [glyph, fraction] of Object.entries(VULGAR)) {
    line = line.replaceAll(glyph, ` ${fraction}`)
  }
  line = line.replace(/\s+/g, ' ').trim()

  // A quantity may be "1 1/2", "1/2", "2", "2.5" or a "2-3" range. The mixed
  // and bare fractions have to come first, or "1/2" would match as just "1".
  const quantityMatch = line.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*/,
  )
  let quantity: string | null = null

  if (quantityMatch) {
    quantity = quantityMatch[1].replace(/\s*[-–]\s*/, '-').trim()
    line = line.slice(quantityMatch[0].length).trim()
  }

  let unit: string | null = null
  const lower = line.toLowerCase()
  for (const candidate of UNITS) {
    if (lower === candidate.toLowerCase()) break // the whole line is a unit — treat it as the item
    if (lower.startsWith(candidate.toLowerCase() + ' ')) {
      unit = line.slice(0, candidate.length)
      line = line.slice(candidate.length).trim()
      break
    }
  }

  // "2 כוסות של קמח" — drop the connector left behind by the unit.
  line = line.replace(/^(של|of)\s+/i, '').trim()

  // A trailing parenthetical is a note, not part of the ingredient name.
  let note: string | null = null
  const noteMatch = line.match(/\(([^)]*)\)\s*$/)
  if (noteMatch) {
    note = noteMatch[1].trim() || null
    line = line.slice(0, noteMatch.index).trim()
  }

  if (!line) {
    // Nothing but a quantity and a unit — keep the original text intact.
    return { quantity: null, unit: null, item: raw.trim(), note: null }
  }

  return { quantity, unit, item: line, note }
}

export function parseIngredientLines(lines: unknown): Ingredient[] {
  if (!Array.isArray(lines)) return []
  return lines
    .map((line) => (typeof line === 'string' ? parseIngredientLine(line) : null))
    .filter((i): i is Ingredient => i !== null)
}

export function sourceTypeForUrl(url: string): RecipeSource {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'url'
  }

  if (host.endsWith('instagram.com')) return 'instagram'
  if (host.endsWith('facebook.com') || host.endsWith('fb.watch') || host.endsWith('fb.com')) {
    return 'facebook'
  }
  if (host.endsWith('tiktok.com')) return 'tiktok'
  return 'url'
}

export function siteNameForUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Collapses whitespace and drops empties — used on every extracted string list. */
export function cleanLines(values: unknown[]): string[] {
  return values
    .map((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
}
