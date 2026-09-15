import { isPreviewMode } from '@/lib/preview'

/**
 * Faixa exibida enquanto o Supabase nao esta configurado. Garante que dado de
 * exemplo nunca seja confundido com operacao real, nem por engano de deploy.
 */
export function PreviewBanner() {
  if (!isPreviewMode()) return null

  return (
    <div className="border-b border-brand/30 bg-brand/10 px-4 py-1.5 text-center text-xs text-foreground/80">
      <strong className="font-semibold text-brand">Preview mode</strong> — showing sample
      data. Connect Supabase to go live; changes are not saved.
    </div>
  )
}
