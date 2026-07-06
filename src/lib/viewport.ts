/** Breakpoints do sistema Multitelas */
export const VIEWPORT_BREAKPOINTS = {
  phoneMax: 767,
  tabletMax: 1023,
} as const

export type ViewportTier = 'phone' | 'tablet' | 'desktop'

export function getViewportTier(width = typeof window !== 'undefined' ? window.innerWidth : 1280): ViewportTier {
  if (width <= VIEWPORT_BREAKPOINTS.phoneMax) return 'phone'
  if (width <= VIEWPORT_BREAKPOINTS.tabletMax) return 'tablet'
  return 'desktop'
}

export function tierUsesDrawerNav(tier: ViewportTier) {
  return tier === 'phone'
}
