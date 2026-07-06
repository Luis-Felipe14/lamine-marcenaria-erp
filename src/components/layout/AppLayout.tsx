import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AppBackground } from './AppBackground'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PageTransition } from './PageTransition'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { PwaInstallBanner } from '@/components/shared/PwaInstallBanner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen)
  const headerKpisVisible = useUIStore((s) => s.headerKpisVisible)
  const addRecentPage = useUIStore((s) => s.addRecentPage)
  const location = useLocation()
  const isMobile = useIsMobile()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, setMobileNavOpen])

  useEffect(() => {
    if (!isMobile || !mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobile, mobileNavOpen])

  useEffect(() => {
    addRecentPage(location.pathname)
  }, [location.pathname, addRecentPage])

  return (
    <>
      <AppBackground />
      <div className="app-shell">
        <CommandPalette />
        {isMobile && mobileNavOpen && (
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
            isMobile
              ? 'layout-main-mobile'
              : sidebarCollapsed
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
