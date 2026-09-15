import type { Metadata } from 'next'
import { Inter, Michroma } from 'next/font/google'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { SITE_URL } from '@/lib/env'

import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

/** Fonte tecnica e larga, igual a da tagline do logo. Usada so em detalhes. */
const michroma = Michroma({
  variable: '--font-display',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Carental — Where Affordable Meets Quality',
    template: '%s | Carental',
  },
  description:
    'Weekly and monthly car rentals. Sedans, SUVs, wagons and more, ready to drive. Where affordable meets quality.',
  openGraph: {
    type: 'website',
    siteName: 'Carental',
    title: 'Carental — Where Affordable Meets Quality',
    description:
      'Weekly and monthly car rentals. Sedans, SUVs, wagons and more, ready to drive.',
    images: ['/Logo_carental.jpeg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carental — Where Affordable Meets Quality',
    description: 'Weekly and monthly car rentals. Where affordable meets quality.',
    images: ['/Logo_carental.jpeg'],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // As variaveis de fonte ficam no <html> porque e nele que o font-sans e
  // aplicado; no <body> a variavel nao existiria e o navegador cairia em serif.
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${michroma.variable}`}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
