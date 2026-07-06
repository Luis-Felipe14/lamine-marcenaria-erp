import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TableDensity = 'comfortable' | 'compact'

export const DEFAULT_WIDGET_ORDER = [
  'hero-kpis',
  'chart-row',
  'pipeline',
  'operations',
  'alerts',
] as const

export type WidgetId = (typeof DEFAULT_WIDGET_ORDER)[number]

interface UIState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  theme: 'dark' | 'light'
  headerKpisVisible: boolean
  commandPaletteOpen: boolean
  recentPages: string[]
  tableDensity: TableDensity
  dashboardWidgetOrder: WidgetId[]
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  toggleMobileNav: () => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setHeaderKpisVisible: (visible: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  addRecentPage: (path: string) => void
  setTableDensity: (density: TableDensity) => void
  setDashboardWidgetOrder: (order: WidgetId[]) => void
  moveWidget: (from: number, to: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      theme: 'dark',
      headerKpisVisible: false,
      commandPaletteOpen: false,
      recentPages: [],
      tableDensity: 'comfortable',
      dashboardWidgetOrder: [...DEFAULT_WIDGET_ORDER],
      setHeaderKpisVisible: (visible) => set({ headerKpisVisible: visible }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      addRecentPage: (path) =>
        set((s) => ({
          recentPages: [path, ...s.recentPages.filter((p) => p !== path)].slice(0, 6),
        })),
      setTableDensity: (density) => set({ tableDensity: density }),
      setDashboardWidgetOrder: (order) => set({ dashboardWidgetOrder: order }),
      moveWidget: (from, to) =>
        set((s) => {
          const order = [...s.dashboardWidgetOrder]
          const [item] = order.splice(from, 1)
          order.splice(to, 0, item)
          return { dashboardWidgetOrder: order }
        }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('light', theme === 'light')
        set({ theme })
      },
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.classList.toggle('light', next === 'light')
          return { theme: next }
        }),
    }),
    { name: 'lamine-ui' }
  )
)
