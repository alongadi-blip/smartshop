import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 3 * 1024 * 1024
const TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 5

// Sites serve very different HTML to obvious bots. A real browser UA gets the
// version that actually carries the JSON-LD recipe block.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export class FetchPageError extends Error {}

function isBlockedIpv4(ip: string) {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || // this network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata at 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  )
}

function isBlockedIpv6(ip: string) {
  const addr = ip.toLowerCase()
  if (addr === '::' || addr === '::1') return true
  // IPv4-mapped (::ffff:10.0.0.1) — judge it by the embedded v4 address.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isBlockedIpv4(mapped[1])
  return (
    addr.startsWith('fc') || addr.startsWith('fd') || // unique local
    addr.startsWith('fe8') || addr.startsWith('fe9') || // link-local
    addr.startsWith('fea') || addr.startsWith('feb')
  )
}

/**
 * The URL comes from a form field, so the request must not be usable to reach
 * anything on the private network or a cloud metadata endpoint.
 */
async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchPageError('אפשר לחלץ רק מכתובות http או https')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')

  const literal = isIP(host)
  if (literal) {
    const blocked = literal === 4 ? isBlockedIpv4(host) : isBlockedIpv6(host)
    if (blocked) throw new FetchPageError('הכתובת הזו אינה נגישה')
    return
  }

  let records: { address: string; family: number }[]
  try {
    records = await lookup(host, { all: true })
  } catch {
    throw new FetchPageError('לא הצלחנו למצוא את האתר הזה')
  }

  for (const { address, family } of records) {
    const blocked = family === 4 ? isBlockedIpv4(address) : isBlockedIpv6(address)
    if (blocked) throw new FetchPageError('הכתובת הזו אינה נגישה')
  }
}

/**
 * Fetches a URL with every redirect hop re-checked.
 *
 * `redirect: 'follow'` would defeat the whole guard: a perfectly public URL is
 * allowed to redirect to 169.254.169.254, and that is exactly what an SSRF
 * against a cloud metadata endpoint looks like. So the hops are walked by hand.
 */
async function safeFetch(rawUrl: string, accept: string) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new FetchPageError('הכתובת אינה תקינה')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(url)

      const response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept,
          'accept-language': 'he-IL,he;q=0.9,en;q=0.8',
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new FetchPageError('האתר החזיר הפניה שבורה')
        await response.body?.cancel()
        url = new URL(location, url)
        continue
      }

      if (!response.ok) throw new FetchPageError(`האתר החזיר שגיאה (${response.status})`)

      const declared = Number(response.headers.get('content-length') ?? 0)
      if (declared > MAX_BYTES) throw new FetchPageError('הקובץ גדול מדי')

      return { response, finalUrl: url.toString(), cleanup: () => clearTimeout(timer) }
    }

    throw new FetchPageError('יותר מדי הפניות')
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof FetchPageError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchPageError('האתר לא הגיב בזמן')
    }
    throw new FetchPageError('לא הצלחנו לקרוא את הכתובת')
  }
}

export type FetchedPage = {
  html: string
  /** The URL we ended on, after redirects — this is what gets saved as source. */
  finalUrl: string
}

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  const { response, finalUrl, cleanup } = await safeFetch(
    rawUrl,
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  )

  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType && !contentType.includes('html') && !contentType.includes('xml')) {
      throw new FetchPageError('הכתובת הזו אינה עמוד אינטרנט')
    }

    const bytes = await readCapped(response)
    return { html: new TextDecoder('utf-8').decode(bytes), finalUrl }
  } finally {
    cleanup()
  }
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export type FetchedImage = { bytes: Uint8Array; contentType: string; extension: string }

/**
 * Downloads a scraped cover image so it can be copied into our own storage.
 * Instagram and Facebook CDN URLs expire within hours, so hotlinking them
 * would leave every saved recipe with a broken picture a day later.
 */
export async function fetchRemoteImage(rawUrl: string): Promise<FetchedImage> {
  const { response, cleanup } = await safeFetch(rawUrl, 'image/*')

  try {
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new FetchPageError('הקישור הזה אינו תמונה נתמכת')
    }

    const bytes = await readCapped(response)
    if (bytes.length === 0) throw new FetchPageError('התמונה ריקה')

    const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.slice('image/'.length)
    return { bytes, contentType, extension }
  } finally {
    cleanup()
  }
}

/** Stops reading at MAX_BYTES so a hostile server cannot stream us forever. */
async function readCapped(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) return new Uint8Array()

  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }

  return new Uint8Array(Buffer.concat(chunks))
}
