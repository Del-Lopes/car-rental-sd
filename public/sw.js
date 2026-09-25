/**
 * Service worker do Carental.
 *
 * Regra de ouro deste app: nada de dado de cliente em cache. O painel, a API,
 * o Supabase e qualquer arquivo privado passam direto pela rede, sempre. O
 * cache guarda so o que e publico e imutavel (os arquivos de build, os icones)
 * e uma pagina de aviso para quando o aparelho estiver sem internet.
 */

const VERSION = 'v1'
const STATIC_CACHE = `carental-static-${VERSION}`
const OFFLINE_URL = '/offline'

// Caminhos que nunca entram em cache, mesmo sendo GET.
const NEVER_CACHE = ['/dashboard', '/api', '/auth', '/login', '/register', '/forgot-password']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Outro dominio (Supabase, fontes): deixa o navegador resolver.
  if (url.origin !== self.location.origin) return
  if (NEVER_CACHE.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) return

  // Arquivos de build e icones: caminho com hash, entao o cache nunca envelhece.
  const isStatic = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  // Paginas publicas: rede primeiro (o conteudo muda), com a pagina de aviso
  // como ultimo recurso quando nao ha conexao.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    )
  }
})
