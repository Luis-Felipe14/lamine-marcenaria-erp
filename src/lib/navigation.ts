import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Target, Users, FileText, Package, Factory,
  Warehouse, ShoppingCart, DollarSign, Megaphone, UserCog,
  MessageSquare, BarChart3, Settings, CreditCard, Truck, PenTool,
} from 'lucide-react'

export interface NavEntry {
  id: string
  label: string
  path: string
  icon: LucideIcon
  group: string
  keywords?: string[]
  permission?: string
}

export const NAV_ENTRIES: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard Geral', path: '/', icon: LayoutDashboard, group: 'Visão Geral', permission: 'dashboard.read', keywords: ['início', 'cockpit', 'inteligência'] },
  { id: 'dashboard-comercial', label: 'Dashboard Comercial', path: '/dashboard/comercial', icon: LayoutDashboard, group: 'Visão Geral', permission: 'dashboard.read', keywords: ['vendas', 'comercial'] },
  { id: 'dashboard-operacional', label: 'Dashboard Operacional', path: '/dashboard/operacional', icon: LayoutDashboard, group: 'Visão Geral', permission: 'dashboard.read', keywords: ['produção', 'operacional'] },
  { id: 'dashboard-financeiro', label: 'Dashboard Financeiro', path: '/dashboard/financeiro', icon: LayoutDashboard, group: 'Visão Geral', permission: 'dashboard.read', keywords: ['financeiro', 'receita'] },
  { id: 'crm', label: 'CRM', path: '/crm', icon: Target, group: 'Comercial', permission: 'crm.read', keywords: ['leads', 'funil', 'vendas'] },
  { id: 'clientes', label: 'Clientes', path: '/clientes', icon: Users, group: 'Comercial', permission: 'clients.read', keywords: ['cadastro', 'cliente'] },
  { id: 'arquitetos', label: 'Arquitetos', path: '/arquitetos', icon: PenTool, group: 'Comercial', permission: 'clients.read', keywords: ['arquiteto', 'parceiro', 'comissão'] },
  { id: 'orcamentos', label: 'Orçamentos', path: '/orcamentos', icon: FileText, group: 'Comercial', permission: 'budgets.read', keywords: ['proposta', 'orçamento'] },
  { id: 'pedidos', label: 'Pedidos', path: '/pedidos', icon: Package, group: 'Operacional', permission: 'orders.read', keywords: ['pedido', 'entrega'] },
  { id: 'producao', label: 'Produção', path: '/producao', icon: Factory, group: 'Operacional', permission: 'production.read', keywords: ['op', 'ordem produção'] },
  { id: 'estoque', label: 'Estoque', path: '/estoque', icon: Warehouse, group: 'Operacional', permission: 'inventory.read', keywords: ['material', 'almoxarifado'] },
  { id: 'compras', label: 'Compras', path: '/compras', icon: ShoppingCart, group: 'Operacional', permission: 'purchases.read', keywords: ['fornecedor', 'compra'] },
  { id: 'fornecedores', label: 'Fornecedores', path: '/fornecedores', icon: Truck, group: 'Operacional', permission: 'purchases.read', keywords: ['madereira', 'fornecedor', 'supplier'] },
  { id: 'credito-madereira', label: 'Crédito Madereira', path: '/credito-madereira', icon: CreditCard, group: 'Operacional', permission: 'lumber_credit.read', keywords: ['madereira', 'cartão', 'crédito', 'material'] },
  { id: 'financeiro', label: 'Financeiro', path: '/financeiro', icon: DollarSign, group: 'Financeiro', permission: 'financial.read', keywords: ['lançamento', 'receita', 'despesa'] },
  { id: 'marketing', label: 'Inv. Marketing', path: '/marketing', icon: Megaphone, group: 'Financeiro', permission: 'marketing.read', keywords: ['investimento', 'gasto', 'prestador', 'divulgação'] },
  { id: 'funcionarios', label: 'Funcionários', path: '/funcionarios', icon: UserCog, group: 'Cadastros', permission: 'employees.read', keywords: ['colaborador', 'rh'] },
  { id: 'solicitacoes', label: 'Solicitações', path: '/solicitacoes', icon: MessageSquare, group: 'Cadastros', permission: 'requests.read', keywords: ['interno', 'ticket'] },
  { id: 'relatorios', label: 'Relatórios', path: '/relatorios', icon: BarChart3, group: 'Sistema', permission: 'reports.read', keywords: ['exportar', 'pdf', 'excel'] },
  { id: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: Settings, group: 'Sistema', permission: 'settings.read', keywords: ['empresa', 'usuários', 'admin'] },
]

const BREADCRUMB_MAP: Record<string, string> = Object.fromEntries(
  NAV_ENTRIES.map((e) => [e.path === '/' ? '/' : e.path, e.label])
)

export function getBreadcrumbLabel(pathname: string): string[] {
  if (pathname === '/') return ['Central de Inteligência']
  const exact = BREADCRUMB_MAP[pathname]
  if (exact) return [exact]
  const segment = pathname.split('/').filter(Boolean)[0]
  const match = NAV_ENTRIES.find((e) => e.path === `/${segment}`)
  return match ? [match.label] : ['Página']
}
