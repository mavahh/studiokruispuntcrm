import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Studio Kruispunt CRM', template: '%s · Studio Kruispunt' },
  description: 'Klanten, content, projecten en financiën van Studio Kruispunt.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#1B2C5E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  )
}
