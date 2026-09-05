import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

import type { ExtractedRecipe } from '@/lib/types'

const IngredientSchema = z.object({
  quantity: z.string().nullable().describe('e.g. "2", "1/2", "2-3". null when unstated.'),
  unit: z.string().nullable().describe('e.g. "כוסות", "כפית", "גרם". null when unstated.'),
  item: z.string().describe('The ingredient itself, without quantity or unit.'),
  note: z.string().nullable().describe('e.g. "חתוך לקוביות", "בטמפרטורת החדר".'),
})

const RecipeSchema = z.object({
  is_recipe: z
    .boolean()
    .describe('false when the text contains no actual recipe — do not invent one.'),
  title: z.string(),
  description: z.string().nullable(),
  servings: z.string().nullable().describe('e.g. "4 מנות", "תבנית אחת".'),
  prep_minutes: z.number().int().nullable(),
  cook_minutes: z.number().int().nullable(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()).describe('One step per entry, in order, unnumbered.'),
  tags: z.array(z.string()).describe('At most 6 short tags, in the source language.'),
})

const SYSTEM = `אתה מחלץ מתכונים מטקסט גולמי שנלקח מדפי אינטרנט, מפוסטים ברשתות חברתיות ומטקסט חופשי.

כללים:
- כתוב את כל הפלט באותה שפה שבה נכתב המתכון במקור. אל תתרגם.
- אל תמציא כלום. שדה שאינו מופיע בטקסט מקבל null, ורשימה שאינה מופיעה נשארת ריקה.
- אם הטקסט אינו מתכון (עמוד שגיאה, מסך התחברות, כתבה ללא מצרכים) — החזר is_recipe=false והשאר את שאר השדות ריקים.
- פרק כל מצרך לכמות, יחידה ופריט. "2 כוסות קמח" הוא quantity="2", unit="כוסות", item="קמח".
- כל הוראת הכנה היא איבר נפרד ברשימה, לפי הסדר, בלי מספור בתחילת השורה.
- זמנים הם מספרים בדקות בלבד. "שעה וחצי" הוא 90.
- התעלם מפרסומות, תפריטי ניווט, תגובות גולשים וכפתורי שיתוף.`

/**
 * The paid half of the hybrid: only reached when the free structured-data path
 * came up empty. Returns null when no key is configured or the call fails, so
 * the caller can still fall back to whatever OpenGraph gave it.
 */
export async function extractWithClaude(
  text: string,
  context: { sourceUrl?: string | null; ogTitle?: string | null },
): Promise<{ recipe: Partial<ExtractedRecipe>; isRecipe: boolean } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (text.trim().length < 40) return null

  const client = new Anthropic()

  const preamble = [
    context.sourceUrl ? `מקור: ${context.sourceUrl}` : null,
    context.ogTitle ? `כותרת העמוד: ${context.ogTitle}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM,
      output_config: {
        format: zodOutputFormat(RecipeSchema),
        // Extraction is a reading task, not a reasoning one — low effort keeps
        // it fast and cheap without costing accuracy here.
        effort: 'low',
      },
      messages: [
        {
          role: 'user',
          content: `${preamble}\n\nחלץ את המתכון מהטקסט הבא:\n\n---\n${text}\n---`,
        },
      ],
    })

    const parsed = response.parsed_output
    if (!parsed) return null

    return {
      isRecipe: parsed.is_recipe,
      recipe: {
        title: parsed.title,
        description: parsed.description,
        servings: parsed.servings,
        prep_minutes: parsed.prep_minutes,
        cook_minutes: parsed.cook_minutes,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        tags: parsed.tags.slice(0, 6),
      },
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[extract] ANTHROPIC_API_KEY is rejected')
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error('[extract] rate limited by the Claude API')
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[extract] Claude API error ${error.status}: ${error.message}`)
    } else {
      console.error('[extract] extraction failed', error)
    }
    return null
  }
}

export const llmAvailable = () => Boolean(process.env.ANTHROPIC_API_KEY)
