import { APP_FAVICON } from '@/lib/branding'

function upsertLink(rel: string, href: string, type?: string) {
  const selector = `link[rel="${rel}"]`
  let link = document.head.querySelector<HTMLLinkElement>(selector)

  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }

  link.href = href
  if (type) link.type = type
  else link.removeAttribute('type')
}

/** Tenta PNG do monograma; se não existir, usa o SVG (mesmo padrão da sidebar). */
export function setupFavicon() {
  const img = new Image()

  img.onload = () => {
    upsertLink('icon', APP_FAVICON.primary, 'image/png')
    upsertLink('apple-touch-icon', APP_FAVICON.primary)
  }

  img.onerror = () => {
    upsertLink('icon', APP_FAVICON.fallback, 'image/svg+xml')
    upsertLink('apple-touch-icon', APP_FAVICON.fallback)
  }

  img.src = APP_FAVICON.primary
}
