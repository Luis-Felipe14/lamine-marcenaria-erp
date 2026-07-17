import { useNavigate } from 'react-router-dom'
import { Plus, Target, FileText, Package, Factory, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasModuleAccess } from '@/lib/secretary-access'
import { useSecretaryAccessSettings } from '@/hooks/useQueries'
import { DEFAULT_SECRETARY_ACCESS } from '@/services/secretary-access.service'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const actions = [
  { label: 'Lead', icon: Target, path: '/crm', permission: 'crm.read' },
  { label: 'Orçamento', icon: FileText, path: '/orcamentos', permission: 'budgets.read' },
  { label: 'Pedido', icon: Package, path: '/pedidos', permission: 'orders.read' },
  { label: 'OP', icon: Factory, path: '/producao', permission: 'production.read' },
  { label: 'Lançamento', icon: DollarSign, path: '/financeiro', permission: 'financial.read' },
]

export function QuickActions({ compact = false, className }: { compact?: boolean; className?: string }) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const { data: secretaryAccess } = useSecretaryAccessSettings()
  const settings = secretaryAccess ?? DEFAULT_SECRETARY_ACCESS
  const visible = actions.filter((a) => hasModuleAccess(role, a.permission, settings))

  if (visible.length === 0) return null

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {visible.slice(0, 3).map((a) => (
          <Button key={a.path} variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate(a.path)}>
            <a.icon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{a.label}</span>
          </Button>
        ))}
        <Button variant="outline" size="sm" className="h-8 gap-1 border-gold/30 text-gold hover:bg-gold/10" onClick={() => navigate(visible[0].path)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Novo</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => (
        <Button
          key={a.path}
          variant="outline"
          size="sm"
          className="gap-2 border-border bg-surface-elevated hover:border-gold/40 hover:bg-gold/5 hover-lift"
          onClick={() => navigate(a.path)}
        >
          <a.icon className="h-4 w-4 text-gold" />
          {a.label}
        </Button>
      ))}
    </div>
  )
}
