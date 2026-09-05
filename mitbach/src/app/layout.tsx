import type { Metadata, Viewport } from 'next'
import { Assistant, Frank_Ruhl_Libre } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const assistant = Assistant({
  variable: '--font-assistant',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
})

const frankRuhl = Frank_Ruhl_Libre({
  variable: '--font-frank-ruhl',
  subsets: ['hebrew', 'latin'],
  weight: ['500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'מטבח',
  description: 'המתכונים של המשפחה, במקום אחד — ותפריטים לחגים ולאירועים.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf9f3' },
    { media: '(prefers-color-scheme: dark)', color: '#221c18' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${frankRuhl.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
