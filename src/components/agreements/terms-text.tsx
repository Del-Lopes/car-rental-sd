import { cn } from '@/lib/utils'

/**
 * Renderiza os termos como texto puro: linha em branco separa paragrafos,
 * quebra simples vira quebra de linha. Sem Markdown nem HTML de proposito --
 * o texto vem de um formulario, e renderizar HTML abriria espaco para injecao.
 */
export function TermsText({ body, className }: { body: string; className?: string }) {
  const paragraphs = body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-foreground/90', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}
