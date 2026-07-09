const CACHE_NAME = 'lamine-erp-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request)
      return cached ?? Response.error()
    }),
  )
})
