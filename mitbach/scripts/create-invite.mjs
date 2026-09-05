// Mints an invitation code from the command line.
//
// Solves the chicken-and-egg problem of an invite-only app: the very first
// account has nobody to invite it, so its code is created here with no issuer.
// After that, everyone else is invited from inside the app.
//
//   npm run invite
//   npm run invite -- --email dana@example.com --days 30
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode() {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `MTB-${block()}-${block()}`
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? null : process.argv[index + 1]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY ב-.env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const days = Number(arg('days') ?? 14)
const email = arg('email')
const note = arg('note')

const { data, error } = await supabase
  .from('invitations')
  .insert({
    code: generateCode(),
    email,
    note,
    expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
  })
  .select('code, expires_at')
  .single()

if (error) {
  console.error('יצירת ההזמנה נכשלה:', error.message)
  process.exit(1)
}

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

console.log('')
console.log('  קוד ההזמנה:  ' + data.code)
console.log('  קישור:       ' + `${site}/join?code=${data.code}`)
console.log('  בתוקף עד:    ' + new Date(data.expires_at).toLocaleString('he-IL'))
if (email) console.log('  נעול לכתובת: ' + email)
console.log('')
