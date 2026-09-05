import * as cheerio from 'cheerio'

import type { ExtractedRecipe } from '@/lib/types'
import {
  cleanLines,
  isoDurationToMinutes,
  parseIngredientLines,
  siteNameForUrl,
  sourceTypeForUrl,
} from './parse-helpers'

type Json = Record<string, unknown>

const asArray = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim() || null
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return asString(value[0])
  if (value && typeof value === 'object') {
    const obj = value as Json
    return asString(obj.name ?? obj.text ?? obj.url ?? obj['@value'])
  }
  return null
}

const hasType = (node: Json, type: string) =>
  asArray(node['@type']).some((t) => typeof t === 'string' && t.toLowerCase() === type.toLowerCase())

/** Walks @graph, arrays and nested nodes to find the schema.org/Recipe node. */
function findRecipeNode(value: unknown, depth = 0): Json | null {
  if (depth > 6 || !value || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findRecipeNode(entry, depth + 1)
      if (found) return found
    }
    return null
  }

  const node = value as Json
  if (hasType(node, 'Recipe')) return node

  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'hasPart']) {
    const found = findRecipeNode(node[key], depth + 1)
    if (found) return found
  }
  return null
}

/** HowToStep / HowToSection / plain strings all end up as a flat step list. */
function flattenInstructions(value: unknown, depth = 0): string[] {
  if (depth > 4) return []

  if (typeof value === 'string') {
    // A single blob: split on newlines, then on numbered markers.
    const byLine = value.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
    if (byLine.length > 1) return byLine
    return value
      .split(/(?:^|\s)\d+[.)]\s+/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 2)
  }

  if (Array.isArray(value)) return value.flatMap((entry) => flattenInstructions(entry, depth + 1))

  if (value && typeof value === 'object') {
    const node = value as Json
    if (node.itemListElement) return flattenInstructions(node.itemListElement, depth + 1)
    const text = asString(node.text) ?? asString(node.name)
    return text ? [text] : []
  }

  return []
}

function pickImage(value: unknown): string | null {
  for (const entry of asArray(value)) {
    const url = typeof entry === 'string' ? entry : asString((entry as Json)?.url)
    if (url?.startsWith('http')) return url
  }
  return null
}

function collectTags(node: Json): string[] {
  const raw = [
    ...asArray(node.recipeCategory),
    ...asArray(node.recipeCuisine),
    ...asArray(node.keywords).flatMap((k) => (typeof k === 'string' ? k.split(',') : [k])),
  ]
  const tags = cleanLines(raw).map((t) => t.replace(/^#/, ''))
  return Array.from(new Set(tags)).slice(0, 12)
}

function emptyRecipe(url: string | null): ExtractedRecipe {
  return {
    title: '',
    description: null,
    image_url: null,
    source_url: url,
    source_type: url ? sourceTypeForUrl(url) : 'manual',
    source_name: url ? siteNameForUrl(url) : null,
    servings: null,
    prep_minutes: null,
    cook_minutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
  }
}

/** schema.org/Recipe in a ld+json block — the best case, and surprisingly common. */
export function fromJsonLd($: cheerio.CheerioAPI, url: string): ExtractedRecipe | null {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).contents().text().trim()
    if (!raw) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Some CMSs emit trailing commas or stray control characters.
      try {
        parsed = JSON.parse(raw.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001F]/g, ' '))
      } catch {
        continue
      }
    }

    const node = findRecipeNode(parsed)
    if (!node) continue

    const ingredients = parseIngredientLines(
      cleanLines([...asArray(node.recipeIngredient), ...asArray(node.ingredients)]),
    )
    const instructions = cleanLines(flattenInstructions(node.recipeInstructions))
    if (ingredients.length === 0 && instructions.length === 0) continue

    const total = isoDurationToMinutes(node.totalTime)
    const prep = isoDurationToMinutes(node.prepTime)
    const cook = isoDurationToMinutes(node.cookTime)

    return {
      ...emptyRecipe(url),
      title: asString(node.name) ?? '',
      description: asString(node.description),
      image_url: pickImage(node.image),
      servings: asString(node.recipeYield),
      prep_minutes: prep,
      // Fall back to totalTime so a recipe that only publishes one number
      // still shows a duration instead of nothing.
      cook_minutes: cook ?? (prep === null ? total : null),
      ingredients,
      instructions,
      tags: collectTags(node),
    }
  }

  return null
}

/** Older sites use itemprop attributes instead of ld+json. */
export function fromMicrodata($: cheerio.CheerioAPI, url: string): ExtractedRecipe | null {
  const scope = $('[itemtype*="schema.org/Recipe" i]').first()
  if (scope.length === 0) return null

  const prop = (name: string) =>
    scope
      .find(`[itemprop="${name}"]`)
      .toArray()
      .map((el) => {
        const $el = $(el)
        return ($el.attr('content') ?? $el.attr('datetime') ?? $el.text()).trim()
      })
      .filter(Boolean)

  const ingredients = parseIngredientLines(cleanLines(prop('recipeIngredient').concat(prop('ingredients'))))
  const instructions = cleanLines(prop('recipeInstructions').flatMap((t) => flattenInstructions(t)))
  if (ingredients.length === 0 && instructions.length === 0) return null

  const image = scope.find('[itemprop="image"]').first()

  return {
    ...emptyRecipe(url),
    title: prop('name')[0] ?? '',
    description: prop('description')[0] ?? null,
    image_url: image.attr('content') ?? image.attr('src') ?? null,
    servings: prop('recipeYield')[0] ?? null,
    prep_minutes: isoDurationToMinutes(prop('prepTime')[0]),
    cook_minutes: isoDurationToMinutes(prop('cookTime')[0]),
    ingredients,
    instructions,
    tags: [],
  }
}

/**
 * Title, image and description from meta tags. Never enough on its own, but it
 * seeds the review form and gives the LLM pass a picture to keep.
 */
export function fromOpenGraph($: cheerio.CheerioAPI, url: string): ExtractedRecipe {
  const meta = (name: string) =>
    $(`meta[property="${name}"]`).attr('content') ??
    $(`meta[name="${name}"]`).attr('content') ??
    null

  const title =
    meta('og:title') ??
    meta('twitter:title') ??
    ($('h1').first().text().trim() || $('title').text().trim())

  return {
    ...emptyRecipe(url),
    title: (title ?? '').replace(/\s+/g, ' ').trim(),
    description: meta('og:description') ?? meta('description') ?? meta('twitter:description'),
    image_url: meta('og:image') ?? meta('twitter:image'),
    source_name: meta('og:site_name') ?? siteNameForUrl(url),
  }
}

/**
 * Readable page text for the LLM pass, with the chrome stripped out so the
 * model spends its context on the recipe rather than on navigation menus.
 */
export function readableText($: cheerio.CheerioAPI, limit = 30_000) {
  const $body = $('body').clone()
  $body.find('script, style, noscript, svg, nav, header, footer, form, iframe, aside').remove()

  return $body
    .text()
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, limit)
}

export { emptyRecipe }
