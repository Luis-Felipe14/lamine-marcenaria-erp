import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, Bell, Moon, Sun, LogOut, Menu,
  TrendingUp, Package, Wallet, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useBreadcrumb } from '@/hooks/useBreadcrumb'
import { useHeaderHeightSync } from '@/hooks/useHeaderHeightSync'
import { useViewport } from '@/hooks/useViewport'
import { useHeaderMetrics, useNotifications } from '@/hooks/useQueries'
import { useSecretaryAccess } from '@/hooks/useSecretaryAccess'
import { cn, formatCurrency } from '@/lib/utils'
import { formatCurrencyMasked } from '@/lib/secretary-access'

export function Header() {
  const { sidebarCollapsed, theme, toggleTheme, setHeaderKpisVisible, setCommandPaletteOpen, toggleMobileNav } = useUIStore()
  const { isPhone, isTablet } = useViewport()
  const headerRef = useRef<HTMLElement>(null)
  useHeaderHeightSync(headerRef)
  const profile = useAuthStore((s) => s.profile)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { labels, current } = useBreadcrumb()
  const userId = useAuthStore((s) => s.user?.id)
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useNotifications(userId)
  const { data: kpis, isLoading: kpisLoading } = useHeaderMetrics()
  const { canViewAmounts } = useSecretaryAccess()

  const isDashboardRoute = location.pathname === '/' || location.pathname.startsWith('/dashboard')
  const showHeaderKpis = Boolean(kpis) && !kpisLoading && !isDashboardRoute

  useEffect(() => {
    setHeaderKpisVisible(showHeaderKpis)
  }, [showHeaderKpis, setHeaderKpisVisible])

  useEffect(() => {
    if (!showNotif) return
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotif])

  const displayName = profile?.full_name ?? 'Usuário'

  const kpiItems = kpis
    ? [
        {
          label: 'Receita',
          value: formatCurrencyMasked(kpis.monthlyRevenue, canViewAmounts, formatCurrency),
          icon: TrendingUp,
          color: 'text-green-400',
          href: '/financeiro',
        },
        { label: 'Pedidos', value: String(kpis.activeOrders), icon: Package, color: 'text-blue-400', href: '/pedidos' },
        {
          label: 'A receber',
          value: formatCurrencyMasked(kpis.accountsReceivable, canViewAmounts, formatCurrency),
          icon: Wallet,
          color: 'text-gold',
          href: '/financeiro',
        },
        { label: 'Estoque', value: String(kpis.criticalStock), icon: AlertTriangle, color: kpis.criticalStock > 0 ? 'text-red-400' : 'text-gray-400', href: '/estoque' },
      ]
    : []

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed top-0 right-0 z-50 flex flex-col glass-panel app-header transition-all duration-300',
        isPhone
          ? 'header-offset-mobile'
          : isTablet || sidebarCollapsed
            ? 'header-offset-collapsed'
            : 'header-offset-expanded',
      )}
    >
      <div className={cn(
        'hidden border-b border-border/40 px-4 py-1 md:block lg:px-6',
        !showHeaderKpis && 'md:hidden'
      )}>
        <div className="flex items-center gap-1.5 overflow-x-auto min-h-[28px]">
          {kpisLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 shrink-0 rounded-full" />
            ))
          ) : (
            kpiItems.map((kpi) => (
              <button
                key={kpi.label}
                type="button"
                onClick={() => navigate(kpi.href)}
                className="kpi-chip hover-lift cursor-pointer"
              >
                <kpi.icon className={cn('h-3 w-3', kpi.color)} />
                <span className="text-gray-500">{kpi.label}</span>
                <span className={cn('font-semibold tabular-nums', kpi.color)}>{kpi.value}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={cn(
        'flex shrink-0 items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:px-6',
        isPhone ? 'h-auto min-h-14 flex-col py-2' : 'h-14 justify-between gap-3',
      )}>
        {isPhone ? (
          <>
            <div className="header-phone-toolbar flex w-full min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="header-icon-btn h-9 w-9 shrink-0"
                onClick={toggleMobileNav}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="header-phone-search command-trigger flex min-h-9 min-w-0 flex-1 items-center gap-2 border px-3 py-2 text-left"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate text-sm text-gray-500">Buscar...</span>
              </button>

              <div className="flex shrink-0 items-center gap-0.5">
                {kpis && kpis.criticalStock > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/estoque')}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-400"
                    aria-label={`${kpis.criticalStock} itens críticos no estoque`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                )}

                <div className="relative" ref={notifRef}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="header-icon-btn relative h-9 w-9"
                    onClick={() => setShowNotif(!showNotif)}
                    aria-label="Notificações"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black animate-scale-in">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                  {showNotif && (
                    <div className="glass-modal absolute right-0 top-full z-[60] mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl p-2 animate-scale-in">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-sm text-gray-500">Sem notificações</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="rounded-lg p-3 transition-colors duration-200 hover:bg-surface-elevated">
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-gray-500">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <Button type="button" variant="ghost" size="icon" className="header-icon-btn h-9 w-9" onClick={toggleTheme} aria-label="Alternar tema">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <p className="w-full truncate px-1 text-left text-xs font-medium text-gray-400">{current}</p>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <nav className="flex min-w-0 items-center gap-1" aria-label="Breadcrumb">
                <span className="breadcrumb-item">Laminê</span>
                {labels.map((label, i) => (
                  <span key={label} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-gray-600" />
                    <span className={i === labels.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item'}>
                      {label}
                    </span>
                  </span>
                ))}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="command-trigger hidden sm:flex"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">Buscar...</span>
              <kbd className="rounded-full border border-border bg-surface-card px-1.5 py-0.5 text-[10px] text-gray-500">Ctrl K</kbd>
            </button>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {kpis && kpis.criticalStock > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/estoque')}
                  className="flex md:hidden items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] text-red-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {kpis.criticalStock}
                </button>
              )}

              <div className="relative" ref={notifRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="header-icon-btn relative h-9 w-9"
                  onClick={() => setShowNotif(!showNotif)}
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black animate-scale-in">
                      {notifications.length}
                    </span>
                  )}
                </Button>
                {showNotif && (
                  <div className="glass-modal absolute right-0 top-full z-[60] mt-2 w-80 rounded-xl p-2 animate-scale-in">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">Sem notificações</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="rounded-lg p-3 transition-colors duration-200 hover:bg-surface-elevated">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-gray-500">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Button type="button" variant="ghost" size="icon" className="header-icon-btn h-9 w-9" onClick={toggleTheme} aria-label="Alternar tema">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <div className="ml-1 hidden items-center gap-2 rounded-full border border-border/60 bg-surface-elevated/80 px-2.5 py-1 lg:flex">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="max-w-[100px] text-left">
                  <p className="truncate text-xs font-medium" title={displayName}>{displayName}</p>
                  <p className="truncate text-[10px] text-gray-500">{profile?.role?.label}</p>
                </div>
              </div>

              <Button type="button" variant="ghost" size="icon" className="header-icon-btn h-9 w-9" onClick={() => signOut()} aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
