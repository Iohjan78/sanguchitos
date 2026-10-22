import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Viernes de sanguchitos',
  description: 'Lista compartida para organizar los sanguchitos del viernes.',
  generator: 'v0.app',
  icons: {
    // El icono trae su propio fondo naranja, asi que sirve igual en claro y
    // en oscuro: no hacen falta dos versiones. El png es el respaldo para los
    // navegadores que todavia no aceptan favicon en svg.
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff8ed' },
    { media: '(prefers-color-scheme: dark)', color: '#762d23' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
