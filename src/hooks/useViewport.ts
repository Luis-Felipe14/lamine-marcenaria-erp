import { useEffect, useState } from 'react'
import { getViewportTier, tierUsesDrawerNav, type ViewportTier } from '@/lib/viewport'

export function useViewport() {
  const [tier, setTier] = useState<ViewportTier>(() => getViewportTier())

  useEffect(() => {
    const update = () => setTier(getViewportTier(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return {
    tier,
    isPhone: tier === 'phone',
    isTablet: tier === 'tablet',
    isDesktop: tier === 'desktop',
    /** Celular — layout drawer e header compacto */
    isMobile: tier === 'phone',
    usesDrawerNav: tierUsesDrawerNav(tier),
  }
}

/** @deprecated Prefira useViewport().isPhone */
export function useIsMobile() {
  const { isPhone } = useViewport()
  return isPhone
}
