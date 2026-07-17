export const APP_NAME = 'Laminê'
export const APP_SUBTITLE = 'Marcenaria & Interiores'

export const LEAD_STATUSES = [
  { value: 'novo_lead', label: 'Novo Lead', color: 'bg-blue-500' },
  { value: 'em_negociacao', label: 'Em Negociação', color: 'bg-yellow-500' },
  { value: 'orcamento_enviado', label: 'Orçamento Enviado', color: 'bg-orange-500' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
] as const

export const BUDGET_STATUSES = [
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'convertido_pedido', label: 'Convertido em Pedido' },
] as const

/** Status que indicam orçamento ganho (inclui legado `aprovado` no banco). */
export const BUDGET_WON_STATUSES = ['convertido_pedido', 'aprovado'] as const

export function getBudgetStatusLabel(status: string): string {
  if (status === 'aprovado') return 'Convertido em Pedido'
  return BUDGET_STATUSES.find((s) => s.value === status)?.label ?? status
}

export const ORDER_STATUSES = [
  { value: 'projeto_desenvolvimento', label: 'Projeto em Desenvolvimento' },
  { value: 'aguardando_material', label: 'Aguardando Material' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'pronto_entrega', label: 'Pronto para Entrega' },
  { value: 'em_montagem', label: 'Em Montagem' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

const LEGACY_ORDER_STATUS_LABELS: Record<string, string> = {
  em_acabamento: 'Em Acabamento',
}

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUSES.find((s) => s.value === status)?.label
    ?? LEGACY_ORDER_STATUS_LABELS[status]
    ?? status
}

export const PRODUCTION_STATUSES = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

export interface ProductionChecklistItem {
  id: string
  label: string
  done: boolean
}

export const DEFAULT_PRODUCTION_CHECKLIST: ProductionChecklistItem[] = [
  { id: 'medidas', label: 'Conferir medidas do projeto', done: false },
  { id: 'materiais', label: 'Separar materiais', done: false },
  { id: 'corte', label: 'Corte', done: false },
  { id: 'furacao', label: 'Furação e usinagem', done: false },
  { id: 'montagem', label: 'Montagem', done: false },
  { id: 'acabamento', label: 'Acabamento / fitas', done: false },
  { id: 'conferencia', label: 'Conferência final', done: false },
]

export const MATERIAL_CATEGORIES = [
  { value: 'mdf', label: 'MDF' },
  { value: 'ferragens', label: 'Ferragens' },
  { value: 'parafusos', label: 'Parafusos' },
  { value: 'cola', label: 'Cola' },
  { value: 'fitas_borda', label: 'Fitas de Borda' },
  { value: 'puxadores', label: 'Puxadores' },
  { value: 'acessorios', label: 'Acessórios' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'outros', label: 'Outros' },
] as const

export const MATERIAL_USAGE_TYPES = [
  { value: 'materia_prima', label: 'Matéria-prima' },
  { value: 'consumo', label: 'Uso e consumo' },
] as const

export const MATERIAL_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'm2', label: 'Metro quadrado (m²)' },
  { value: 'm', label: 'Metro linear (m)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'par', label: 'Par' },
  { value: 'rolo', label: 'Rolo' },
] as const

export function getMaterialCategoryLabel(value: string): string {
  return MATERIAL_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function getMaterialUsageTypeLabel(value: string): string {
  return MATERIAL_USAGE_TYPES.find((t) => t.value === value)?.label ?? value
}

export function getMaterialUnitLabel(value: string): string {
  return MATERIAL_UNITS.find((u) => u.value === value)?.label ?? value
}

/** Categorias simplificadas para materiais de uso e consumo */
export const CONSUMPTION_CATEGORIES = [
  { value: 'escritorio', label: 'Escritório' },
  { value: 'acessorios', label: 'Acessórios / Consumo' },
  { value: 'outros', label: 'Outros' },
] as const

/** Unidades mais usadas em consumo */
export const CONSUMPTION_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'rolo', label: 'Rolo' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'kg', label: 'Quilograma (kg)' },
] as const

export const PURCHASE_STATUSES = [
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'comprado', label: 'Comprado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export const CAMPAIGN_CHANNELS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'site', label: 'Site' },
  { value: 'trafego_pago', label: 'Tráfego pago' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'outros', label: 'Outros' },
] as const

export const PAYMENT_STATUSES = [
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
] as const

export const FINANCIAL_CATEGORIES = {
  receita: [
    { value: 'sinal', label: 'Sinal', hint: 'Entrada na aprovação do orçamento' },
    { value: 'pedido', label: 'Pagamento', hint: 'Recebimentos do projeto (parcelas ou quitação)' },
    { value: 'outros', label: 'Outros', hint: 'Receitas que não se encaixam acima' },
  ],
  despesa: [
    { value: 'salario', label: 'Salários', hint: 'Folha de pagamento e encargos' },
    { value: 'compra', label: 'Compras / Materiais', hint: 'Materiais, insumos e fretes' },
    { value: 'contas_fixas', label: 'Contas fixas', hint: 'Aluguel, energia, água, internet' },
    { value: 'marketing', label: 'Marketing', hint: 'Investimentos em divulgação' },
    { value: 'outros', label: 'Outros', hint: 'Demais despesas' },
  ],
} as const

/** Rótulos para exibição, inclusive categorias antigas já migradas */
export const FINANCIAL_CATEGORY_LABELS: Record<string, string> = {
  sinal: 'Sinal',
  pedido: 'Pagamento',
  pagamento: 'Pagamento',
  outros: 'Outros',
  salario: 'Salários',
  compra: 'Compras / Materiais',
  contas_fixas: 'Contas fixas',
  energia: 'Contas fixas',
  agua: 'Contas fixas',
  internet: 'Contas fixas',
  aluguel: 'Contas fixas',
  transporte: 'Compras / Materiais',
  marketing: 'Marketing',
}

export function getFinancialCategoryLabel(category: string): string {
  return FINANCIAL_CATEGORY_LABELS[category] ?? category
}

export function getFinancialCategoryHint(type: 'receita' | 'despesa', category: string): string | undefined {
  const list = FINANCIAL_CATEGORIES[type]
  return list.find((c) => c.value === category)?.hint
}

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outros', label: 'Outros' },
] as const

/** Destino do valor em receitas — madeireira não conta no Dashboard Executivo */
export const CASH_DESTINATIONS = [
  {
    value: 'empresa',
    label: 'Caixa Laminê',
    hint: 'Valor recebido pela empresa — entra no Dashboard Executivo',
  },
  {
    value: 'madeireira',
    label: 'Madeireira',
    hint: 'Valor passado na madeireira (crédito/material) — fora do caixa Executivo',
  },
] as const

export type CashDestination = (typeof CASH_DESTINATIONS)[number]['value']

export function getCashDestinationLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return CASH_DESTINATIONS.find((d) => d.value === value)?.label ?? value
}

export const LUMBER_CREDIT_MOVEMENT_TYPES = [
  { value: 'entrada', label: 'Entrada', hint: 'Cliente passou cartão — crédito gerado na madereira' },
  { value: 'saida', label: 'Saída', hint: 'Material retirado — desconto do crédito' },
] as const

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method
}

const SELECT_NONE = '__none__'

export { SELECT_NONE }

export const REQUEST_PRIORITIES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
] as const

export const DEPARTMENTS = [
  { value: 'gestao', label: 'Gestão' },
  { value: 'secretaria', label: 'Secretária' },
  { value: 'operacional', label: 'Produção' },
] as const

/** Setores do cadastro de funcionários (Gestão fica só em Proprietários) */
export const EMPLOYEE_DEPARTMENTS = DEPARTMENTS.filter((d) => d.value !== 'gestao')
export const EMPLOYEE_DEPARTMENT_NAMES = EMPLOYEE_DEPARTMENTS.map((d) => d.value)

export const ROLES = [
  { value: 'gestor', label: 'Proprietário' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'producao', label: 'Produção' },
] as const

export const ROLE_DESCRIPTIONS: Record<(typeof ROLES)[number]['value'], string> = {
  gestor: 'Proprietários da empresa — cadastro em Configurações → Proprietários. Acesso total ao ERP.',
  secretaria: 'Compras, estoque, crédito madereira, despesas, funcionários (consulta) e relatórios.',
  producao: 'Marceneiros e ajudantes — produção, pedidos (leitura) e solicitações internas.',
}

export const PAGE_SIZE = 20

export const TIME_ENTRY_TYPES = [
  { value: 'producao', label: 'Produção' },
  { value: 'hora_extra', label: 'Hora extra' },
] as const

export const RECEIPT_TYPES = [
  { value: 'recibo', label: 'Recibo' },
  { value: 'adiantamento', label: 'Adiantamento' },
] as const

export function getTimeEntryTypeLabel(value: string): string {
  return TIME_ENTRY_TYPES.find((t) => t.value === value)?.label ?? value
}

export function getReceiptTypeLabel(value: string): string {
  return RECEIPT_TYPES.find((t) => t.value === value)?.label ?? value
}
