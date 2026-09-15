/**
 * Destino de redirect vindo de fora (querystring, formulario, link de e-mail).
 * So aceita caminho interno: "//evil.com", "/\evil.com" e "https://evil.com"
 * viram o padrao. Sem isso o login viraria um trampolim para phishing.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return value
}
