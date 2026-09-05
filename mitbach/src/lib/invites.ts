import { randomInt } from 'node:crypto'

// No I, L, O, 0 or 1 — these codes get read aloud and retyped from phones.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** e.g. MTB-K7QF-3XZP — roughly 8.5e11 possibilities, single use, expiring. */
export function generateInviteCode() {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `MTB-${block()}-${block()}`
}

/** Accepts what a user actually pastes: spaces, lowercase, missing dashes. */
export function normalizeInviteCode(raw: string) {
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Drop the prefix only at the full length — the 8-char body may itself
  // legitimately start with MTB, since M, T and B are all in the alphabet.
  const body = clean.length === 11 && clean.startsWith('MTB') ? clean.slice(3) : clean
  if (body.length !== 8) return clean

  return `MTB-${body.slice(0, 4)}-${body.slice(4)}`
}

export function inviteUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''
  return `${base}/join?code=${encodeURIComponent(code)}`
}
