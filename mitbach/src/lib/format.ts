import type { GroupRole, Ingredient, RecipeSource } from './types'

export const ROLE_LABELS: Record<GroupRole, string> = {
  admin: 'מנהל',
  editor: 'עורך',
  viewer: 'צופה',
}

export const ROLE_DESCRIPTIONS: Record<GroupRole, string> = {
  admin: 'מאשר ומסיר חברים, משנה הרשאות ומוחק תכנים',
  editor: 'מוסיף מתכונים, עורך ובונה תפריטים',
  viewer: 'צופה בלבד',
}

export const SOURCE_LABELS: Record<RecipeSource, string> = {
  manual: 'הוזן ידנית',
  url: 'מאתר אינטרנט',
  instagram: 'אינסטגרם',
  facebook: 'פייסבוק',
  tiktok: 'טיקטוק',
  text: 'מטקסט חופשי',
}

/** The default course order for a menu; users may add their own. */
export const MENU_CATEGORIES = [
  'מנות פתיחה',
  'מנות ראשונות',
  'מנות עיקריות',
  'תוספות',
  'סלטים',
  'קינוחים',
  'שתייה',
  'אחר',
]

export function formatMinutes(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} דק׳`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hoursLabel = hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : `${hours} שעות`
  return rest ? `${hoursLabel} ו-${rest} דק׳` : hoursLabel
}

export function totalMinutes(prep: number | null, cook: number | null) {
  const sum = (prep ?? 0) + (cook ?? 0)
  return sum > 0 ? sum : null
}

export function formatEventDate(date: string | null): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatRelativeDate(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  )
}

/** "2 כוסות קמח" — the pieces are stored apart so they can be edited apart. */
export function ingredientToText(ingredient: Ingredient): string {
  return [ingredient.quantity, ingredient.unit, ingredient.item].filter(Boolean).join(' ')
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}
