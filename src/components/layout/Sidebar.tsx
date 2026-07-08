import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Target, FileText, Package, Factory,
  Warehouse, ShoppingCart, DollarSign, Megaphone, UserCog,
  MessageSquare, BarChart3, Settings, Menu, LogOut, CreditCard, ClipboardList, X, PenTool,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarBrandHeader } from './SidebarBrandHeader'
import { useViewport } from '@/hooks/useViewport'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission, canAccessDashboard, canAccessReports } from '@/lib/permissions'
import { useSidebarBadgesQuery } from '@/hooks/useQueries'
import type { UserRole } from '@/types'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  permission: string
  alert?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const mainNavGroups: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard Geral', permission: 'dashboard.read' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/crm', icon: Target, label: 'CRM', permission: 'crm.read' },
      { to: '/clientes', icon: Users, label: 'Clientes', permission: 'clients.read' },
      { to: '/arquitetos', icon: PenTool, label: 'Arquitetos', permission: 'clients.read' },
      { to: '/orcamentos', icon: FileText, label: 'Orçamentos', permission: 'budgets.read' },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { to: '/pedidos', icon: Package, label: 'Pedidos', permission: 'orders.read', alert: true },
      { to: '/producao', icon: Factory, label: 'Produção', permission: 'production.read' },
      { to: '/estoque', icon: Warehouse, label: 'Estoque', permission: 'inventory.read', alert: true },
      { to: '/compras', icon: ShoppingCart, label: 'Compras', permission: 'purchases.read' },
      { to: '/credito-madereira', icon: CreditCard, label: 'Créd. Madereira', permission: 'lumber_credit.read' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/financeiro', icon: DollarSign, label: 'Financeiro', permission: 'financial.read' },
      { to: '/marketing', icon: Megaphone, label: 'Inv. Marketing', permission: 'marketing.read' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/funcionarios', icon: UserCog, label: 'Funcionários', permission: 'employees.read' },
      { to: '/folha', icon: ClipboardList, label: 'Folha e Recibos', permission: 'payroll.read' },
      { to: '/solicitacoes', icon: MessageSquare, label: 'Solicitações', permission: 'requests.read', alert: true },
    ],
  },
]

const systemNavGroup: NavGroup = {
  label: 'Sistema',
  items: [
    { to: '/relatorios', icon: BarChart3, label: 'Relatórios', permission: 'reports.read' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações', permission: 'settings.read' },
  ],
}

function isItemVisible(item: NavItem, role: UserRole | undefined): boolean {
  if (item.to === '/') return canAccessDashboard(role)
  if (item.to === '/relatorios') return canAccessReports(role)
  return hasPermission(role, item.permission)
}

function filterVisibleGroups(groups: NavGroup[], role: UserRole | undefined) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isItemVisible(item, role)),
    }))
    .filter((group) => group.items.length > 0)
}

function NavItemLink({
  item,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  badge?: number
  onNavigate?: () => void
}) {
  const showBadge = badge !== undefined && badge > 0

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'sidebar-nav-item',
          collapsed && 'relative justify-center px-2',
          isActive && 'sidebar-nav-item-active'
        )
      }
    >
      <item.icon className={cn('sidebar-nav-icon h-[18px] w-[18px] shrink-0')} />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {showBadge && (
            <span className={cn(
              'sidebar-badge',
              item.alert ? 'sidebar-badge-alert' : 'sidebar-badge-gold'
            )}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {collapsed && showBadge && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400 ring-2 ring-[#121212]" />
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore()
  const { usesDrawerNav } = useViewport()
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const { signOut } = useAuth()
  const { data: badges = {} } = useSidebarBadgesQuery()

  const collapsed = usesDrawerNav ? false : sidebarCollapsed
  const closeMobileNav = () => {
    if (usesDrawerNav) setMobileNavOpen(false)
  }

  const visibleMainGroups = filterVisibleGroups(mainNavGroups, role)
  const visibleSystemGroup = {
    ...systemNavGroup,
    items: systemNavGroup.items.filter((item) => isItemVisible(item, role)),
  }

  return (
    <aside
      className={cn(
        'sidebar-shell fixed z-40 flex flex-col overflow-hidden transition-all duration-300',
        'top-[var(--sidebar-inset)] bottom-[var(--sidebar-inset)] left-[var(--sidebar-inset)]',
        usesDrawerNav
          ? cn('sidebar-mobile w-[min(85vw,var(--sidebar-width))]', mobileNavOpen && 'sidebar-mobile-open')
          : collapsed
            ? 'w-[var(--sidebar-collapsed-width)]'
            : 'w-[var(--sidebar-width)]',
      )}
      aria-hidden={usesDrawerNav && !mobileNavOpen}
    >
      <div className="sidebar-shine" aria-hidden="true" />
      <div className={cn('sidebar-header shrink-0', collapsed ? 'px-1.5 pt-1.5' : 'px-2.5 pt-2.5 md:px-3 md:pt-3')}>
        <div className={cn('flex items-center', collapsed && !usesDrawerNav ? 'justify-center' : 'justify-between')}>
          {usesDrawerNav && (
            <button
              type="button"
              onClick={closeMobileNav}
              className="sidebar-toggle flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-gold light:hover:bg-gray-100"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!usesDrawerNav && (
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                'sidebar-toggle flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-gold light:hover:bg-gray-100',
                collapsed ? 'mx-auto' : 'ml-auto',
              )}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <Menu className="h-4 w-4 md:h-[18px] md:w-[18px]" />
            </button>
          )}
        </div>

        <SidebarBrandHeader collapsed={collapsed && !usesDrawerNav} />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5 pb-2.5">
        <div className="space-y-1">
          {visibleMainGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="nav-group-label">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                    badge={badges[item.to]}
                    onNavigate={closeMobileNav}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <div className="sidebar-divider" />
          <div>
            {!collapsed && (
              <p className="nav-group-label">{visibleSystemGroup.label}</p>
            )}
            <div className="space-y-0.5">
              {visibleSystemGroup.items.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={closeMobileNav}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  closeMobileNav()
                  void signOut()
                }}
                title={collapsed ? 'Sair' : undefined}
                className={cn(
                  'sidebar-nav-item w-full text-left',
                  collapsed && 'justify-center px-2'
                )}
              >
                <LogOut className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  )
}
