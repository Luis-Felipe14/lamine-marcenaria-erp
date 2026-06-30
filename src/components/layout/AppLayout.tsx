import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AppBackground } from './AppBackground'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PageTransition } from './PageTransition'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const headerKpisVisible = useUIStore((s) => s.headerKpisVisible)
  const addRecentPage = useUIStore((s) => s.addRecentPage)
  const location = useLocation()

  useEffect(() => {
    addRecentPage(location.pathname)
  }, [location.pathname, addRecentPage])

  return (
    <>
      <AppBackground />
      <div className="app-shell">
        <CommandPalette />
        <Sidebar />
        <Header />
        <main
          className={cn(
            'layout-main transition-all duration-300',
            !headerKpisVisible && 'layout-main-no-kpi',
            sidebarCollapsed ? 'layout-main-collapsed' : 'layout-main-expanded'
          )}
        >
          <PageTransition />
        </main>
      </div>
    </>
  )
}
