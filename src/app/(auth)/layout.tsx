import Image from 'next/image'
import Link from 'next/link'

import { BrandMark } from '@/components/site/brand-mark'
import { PreviewBanner } from '@/components/site/preview-banner'
import { ThemeToggle } from '@/components/site/theme-toggle'

/**
 * Telas de acesso em duas colunas: a arte original do logo a esquerda (no
 * desktop) e o formulario a direita. No celular fica so o formulario.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner />
      <div className="grid flex-1 lg:grid-cols-2">
        {/* O JPEG e horizontal e o painel e vertical: contain mantem a marca inteira,
            e a mascara radial funde as bordas do arquivo no fundo, sem emenda visivel. */}
        <aside className="relative hidden overflow-hidden bg-[#1b1b1c] lg:block">
          <Image
            src="/Logo_carental.jpeg"
            alt="Carental — Where affordable meets quality"
            fill
            priority
            sizes="50vw"
            className="object-contain [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_72%)]"
          />
        </aside>

        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 sm:px-8">
            <span className="lg:invisible">
              <BrandMark size="sm" />
            </span>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Back to site
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
            <div className="w-full max-w-sm">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
