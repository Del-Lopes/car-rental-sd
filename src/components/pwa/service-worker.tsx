'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker, que e o que faz o site poder ser instalado como
 * aplicativo e abrir uma tela de aviso quando o celular esta sem internet.
 * So em producao: em desenvolvimento ele atrapalharia o recarregamento.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Sem service worker o site funciona igual; nao vale incomodar o usuario.
      })
    }

    // Espera a pagina carregar para nao disputar banda com o conteudo.
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
