import { useState } from 'react'
import { APP_LOGO, APP_MONOGRAM } from '@/lib/branding'

const BRAND_TOOLTIP = 'Laminê ERP — Sistema de Gestão Empresarial'
const LOGO_PRIMARY = APP_LOGO.primary
const LOGO_FALLBACK = APP_LOGO.fallback
const MONOGRAM_PRIMARY = APP_MONOGRAM.primary
const MONOGRAM_FALLBACK = APP_MONOGRAM.fallback

interface SidebarBrandHeaderProps {
  collapsed: boolean
}

export function SidebarBrandHeader({ collapsed }: SidebarBrandHeaderProps) {
  const [logoSrc, setLogoSrc] = useState<string>(LOGO_PRIMARY)
  const [monogramSrc, setMonogramSrc] = useState<string>(MONOGRAM_PRIMARY)

  if (collapsed) {
    return (
      <div className="sidebar-brand sidebar-brand--collapsed animate-fade-in">
        <div
          className="sidebar-brand-monogram group"
          title={BRAND_TOOLTIP}
          aria-label={BRAND_TOOLTIP}
        >
          <img
            src={monogramSrc}
            alt=""
            className="sidebar-brand-monogram-img"
            draggable={false}
            onError={() => {
              if (monogramSrc !== MONOGRAM_FALLBACK) setMonogramSrc(MONOGRAM_FALLBACK)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <header className="sidebar-brand animate-fade-in">
      <div className="sidebar-brand-logo-wrap group" title={BRAND_TOOLTIP}>
        <img
          src={logoSrc}
          alt="Laminê Marcenaria & Interiores"
          className="sidebar-brand-logo"
          draggable={false}
          onError={() => {
            if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK)
          }}
        />
      </div>

      <div className="sidebar-brand-copy">
        <p className="sidebar-brand-subtitle">Sistema de Gestão Empresarial</p>
      </div>

      <div className="sidebar-brand-divider" aria-hidden="true" />
    </header>
  )
}
