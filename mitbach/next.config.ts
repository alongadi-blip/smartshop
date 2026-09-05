import type { NextConfig } from 'next'

/**
 * Saved recipe images always live in our own Supabase bucket — the ingestion
 * flow copies scraped covers there rather than hotlinking them — so exactly
 * one remote host needs to be allowed here. Extraction previews, whose URLs
 * can point anywhere, render through a plain <img> instead.
 */
function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return []

  try {
    return [
      {
        protocol: 'https' as const,
        hostname: new URL(url).hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
  },
}

export default nextConfig
