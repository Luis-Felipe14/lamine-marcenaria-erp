import { useEffect, type RefObject } from 'react'

/** Sincroniza a altura real do header com CSS — evita sobreposição em iPhones com notch/Dynamic Island */
export function useHeaderHeightSync(headerRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const el = headerRef.current
    if (!el) return

    const root = document.documentElement

    const sync = () => {
      root.style.setProperty('--header-measured-height', `${el.offsetHeight}px`)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    window.addEventListener('orientationchange', sync)

    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', sync)
    }
  }, [headerRef, enabled])
}
