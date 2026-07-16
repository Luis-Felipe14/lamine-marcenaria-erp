const CACHE_NAME = 'lamine-erp-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  // Nunca interceptar cross-origin (ex.: Render PDF) nem a API de PDF (proxy Worker)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/pdf/')) return

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request)
      return cached ?? Response.error()
    }),
  )
})
