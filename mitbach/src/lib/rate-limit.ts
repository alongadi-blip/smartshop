import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// Per-instance and in-memory: it resets on redeploy and is not shared between
// serverless instances. That is enough to blunt a code-guessing script; it is
// not a substitute for a real limiter if this ever gets public traffic.
const buckets = new Map<string, Bucket>()

export function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

/** Returns true when the caller is over budget and should be turned away. */
export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    }
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}
