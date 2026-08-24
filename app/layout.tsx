import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Seven Xperts - Diagnóstico de Advocacia',
  description: 'Descubra os gargalos na sua estratégia de captação de clientes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
