import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "PackMunderman's Loggington Enhanced",
  description: 'Log your Ms. Pac-Man game scores',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
