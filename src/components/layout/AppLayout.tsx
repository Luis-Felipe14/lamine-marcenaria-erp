import { useEffect, lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { AppBackground } from './AppBackground'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PageTransition } from './PageTransition'
import { PwaInstallBanner } from '@/components/shared/PwaInstallBanner'
import { useViewport } from '@/hooks/useViewport'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const CommandPalette = lazy(() =>
  import('@/components/shared/CommandPalette').then((m) => ({ default: m.CommandPalette })),
)

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen)
  const headerKpisVisible = useUIStore((s) => s.headerKpisVisible)
  const addRecentPage = useUIStore((s) => s.addRecentPage)
  const location = useLocation()
  const { tier, usesDrawerNav, isTablet } = useViewport()
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)

  useEffect(() => {
    if (tier === 'tablet') setSidebarCollapsed(true)
  }, [tier, setSidebarCollapsed])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, setMobileNavOpen])

  useEffect(() => {
    if (!usesDrawerNav || !mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [usesDrawerNav, mobileNavOpen])

  useEffect(() => {
    addRecentPage(location.pathname)
  }, [location.pathname, addRecentPage])

  return (
    <>
      <AppBackground />
      <div className="app-shell" data-viewport={tier}>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
        {usesDrawerNav && mobileNavOpen && (
          <button
            type="button"
            className="mobile-nav-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <Sidebar />
        <Header />
        <main
          className={cn(
            'layout-main transition-all duration-300',
            !headerKpisVisible && 'layout-main-no-kpi',
            usesDrawerNav
              ? 'layout-main-mobile'
              : sidebarCollapsed || isTablet
                ? 'layout-main-collapsed'
                : 'layout-main-expanded',
          )}
        >
          <PageTransition />
        </main>
        <PwaInstallBanner />
      </div>
    </>
  )
}
