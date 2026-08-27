import type { Metadata } from 'next'
import { Fraunces, Space_Grotesk } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Seven Xperts · Operação Digital e Comercial para Advocacia',
  description:
    'Estruturamos marketing jurídico, atendimento, CRM, automação e inteligência comercial para advogados e escritórios, com foco em organização, mensuração e eficiência da jornada.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  )
}
