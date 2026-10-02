import './globals.css'
import type { Metadata } from 'next'
import { DM_Sans, Newsreader } from 'next/font/google'

const bodyFont = DM_Sans({
  variable: '--font-app-sans',
  subsets: ['latin'],
  display: 'swap',
})

const displayFont = Newsreader({
  variable: '--font-app-display',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AppointCare',
  description: 'Healthcare appointment management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}