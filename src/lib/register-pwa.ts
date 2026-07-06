export function registerPwa() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha silenciosa — app continua funcionando como site normal
    })
  })
}
