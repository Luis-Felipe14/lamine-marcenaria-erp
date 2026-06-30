import { FINANCIAL_CATEGORIES } from '@/lib/constants'

export type FinancialFormType = 'receita' | 'despesa'

export interface FinancialFormState {
  type: FinancialFormType
  category: string
  description: string
  amount: number
  due_date: string
  client_id: string
  order_id: string
  purchase_id: string
  employee_id: string
  payment_method: string
  notes: string
  supplier_id: string
  document_number: string
  installment_number: number | ''
  installment_total: number | ''
}

export type FinancialFieldKey =
  | 'client_id'
  | 'order_id'
  | 'supplier_id'
  | 'purchase_id'
  | 'employee_id'
  | 'document_number'
  | 'payment_method'
  | 'installment_number'
  | 'installment_total'
  | 'notes'
  | 'description'
  | 'amount'
  | 'due_date'

export interface FinancialFieldRule {
  visible: boolean
  required: boolean
  label?: string
  placeholder?: string
  hint?: string
  section?: 'link' | 'payment' | 'core' | 'notes'
}

export function createEmptyFinancialForm(type: FinancialFormType = 'receita'): FinancialFormState {
  return {
    type,
    category: FINANCIAL_CATEGORIES[type][0].value,
    description: '',
    amount: 0,
    due_date: '',
    client_id: '',
    order_id: '',
    purchase_id: '',
    employee_id: '',
    payment_method: '',
    notes: '',
    supplier_id: '',
    document_number: '',
    installment_number: '',
    installment_total: '',
  }
}

function categoryRules(type: FinancialFormType, category: string): Partial<Record<FinancialFieldKey, Omit<FinancialFieldRule, 'visible'> & { visible?: boolean }>> {
  if (type === 'receita') {
    switch (category) {
      case 'sinal':
        return {
          client_id: { visible: true, required: true, label: 'Cliente', section: 'link' },
          order_id: { visible: true, required: false, label: 'Pedido', section: 'link', hint: 'Opcional — vincule ao pedido do projeto' },
        }
      case 'pedido':
        return {
          client_id: { visible: true, required: true, label: 'Cliente', section: 'link' },
          order_id: { visible: true, required: true, label: 'Pedido', section: 'link', hint: 'Parcela ou quitação do projeto' },
        }
      default:
        return {
          client_id: { visible: true, required: false, label: 'Cliente', section: 'link' },
        }
    }
  }

  switch (category) {
    case 'compra':
      return {
        supplier_id: { visible: true, required: false, label: 'Fornecedor', section: 'link' },
        purchase_id: { visible: true, required: false, label: 'Compra vinculada', section: 'link', hint: 'Selecione para preencher fornecedor e NF' },
        document_number: { visible: true, required: false, label: 'Nº documento / NF', section: 'link', placeholder: 'Nota fiscal da compra' },
      }
    case 'salario':
      return {
        employee_id: { visible: true, required: true, label: 'Colaborador', section: 'core', hint: 'Selecione o funcionário — o valor do salário será preenchido automaticamente' },
      }
    case 'contas_fixas':
      return {
        supplier_id: { visible: true, required: false, label: 'Fornecedor / concessionária', section: 'link' },
      }
    case 'marketing':
      return {
        supplier_id: { visible: true, required: false, label: 'Fornecedor / agência', section: 'link' },
      }
    default:
      return {
        supplier_id: { visible: true, required: false, label: 'Fornecedor', section: 'link' },
      }
  }
}

function paymentMethodRules(method: string): Partial<Record<FinancialFieldKey, Omit<FinancialFieldRule, 'visible'> & { visible?: boolean }>> {
  switch (method) {
    case 'cartao':
      return {
        installment_number: { visible: true, required: true, label: 'Parcela', section: 'payment' },
        installment_total: { visible: true, required: true, label: 'Total de parcelas', section: 'payment' },
        document_number: { visible: true, required: false, label: 'Nº documento / NF', section: 'payment', hint: 'Opcional — comprovante ou autorização' },
        notes: { visible: true, required: false, placeholder: 'Bandeira, final do cartão, combinado...', section: 'notes' },
      }
    case 'boleto':
      return {
        document_number: { visible: true, required: true, label: 'Nº boleto / NF', section: 'payment', placeholder: 'Linha digitável ou número da NF' },
        due_date: { visible: true, required: true, label: 'Vencimento', section: 'core' },
        notes: { visible: true, required: false, placeholder: 'Banco emissor, beneficiário...', section: 'notes' },
      }
    case 'pix':
      return {
        notes: { visible: true, required: false, placeholder: 'Chave PIX, comprovante, referência...', section: 'notes' },
      }
    case 'transferencia':
      return {
        notes: { visible: true, required: false, placeholder: 'Banco, titular, comprovante...', section: 'notes' },
      }
    case 'dinheiro':
      return {
        due_date: { visible: true, required: false, label: 'Vencimento', section: 'core', hint: 'Opcional para pagamento em espécie' },
        notes: { visible: true, required: false, placeholder: 'Quem recebeu ou pagou...', section: 'notes' },
      }
    case 'outros':
      return {
        notes: { visible: true, required: false, placeholder: 'Detalhes da forma de pagamento...', section: 'notes' },
      }
    default:
      return {}
  }
}

const CORE_RULES: Record<FinancialFieldKey, FinancialFieldRule> = {
  description: { visible: true, required: true, label: 'Descrição', section: 'core' },
  amount: { visible: true, required: true, label: 'Valor', section: 'core' },
  due_date: { visible: true, required: true, label: 'Vencimento', section: 'core' },
  payment_method: { visible: true, required: false, label: 'Forma de pagamento', section: 'payment' },
  client_id: { visible: false, required: false, section: 'link' },
  order_id: { visible: false, required: false, section: 'link' },
  supplier_id: { visible: false, required: false, section: 'link' },
  purchase_id: { visible: false, required: false, section: 'link' },
  employee_id: { visible: false, required: false, label: 'Colaborador', section: 'core' },
  document_number: { visible: false, required: false, label: 'Nº documento / NF', section: 'payment' },
  installment_number: { visible: false, required: false, label: 'Parcela', section: 'payment' },
  installment_total: { visible: false, required: false, label: 'Total de parcelas', section: 'payment' },
  notes: { visible: true, required: false, label: 'Observações', placeholder: 'Informações adicionais...', section: 'notes' },
}

function hasFieldValue(form: FinancialFormState, key: FinancialFieldKey): boolean {
  const value = form[key]
  if (value === '' || value === 0) return false
  return true
}

export function getFinancialFormFields(
  form: FinancialFormState,
  options: { isEditing?: boolean } = {},
): Record<FinancialFieldKey, FinancialFieldRule> {
  const { isEditing = false } = options
  const fields = { ...CORE_RULES }

  for (const [key, rule] of Object.entries(categoryRules(form.type, form.category)) as [FinancialFieldKey, FinancialFieldRule][]) {
    fields[key] = { ...fields[key], ...rule, visible: rule.visible ?? true }
  }

  if (form.type === 'despesa') {
    fields.client_id = { ...fields.client_id, visible: false }
    fields.order_id = { ...fields.order_id, visible: false }
    if (form.category === 'salario') {
      fields.description = { ...fields.description, visible: false, required: false }
    }
  } else {
    fields.supplier_id = { ...fields.supplier_id, visible: false }
    fields.purchase_id = { ...fields.purchase_id, visible: false }
    fields.employee_id = { ...fields.employee_id, visible: false }
  }

  if (form.payment_method) {
    for (const [key, rule] of Object.entries(paymentMethodRules(form.payment_method)) as [FinancialFieldKey, FinancialFieldRule][]) {
      const merged = { ...fields[key], ...rule, visible: rule.visible ?? true }
      fields[key] = merged
    }
  }

  if (form.type === 'receita' && form.category === 'pedido' && form.payment_method === 'cartao') {
    fields.installment_number = { ...fields.installment_number, visible: true, required: true }
    fields.installment_total = { ...fields.installment_total, visible: true, required: true }
  }

  if (isEditing) {
    for (const key of Object.keys(fields) as FinancialFieldKey[]) {
      if (!fields[key].visible && hasFieldValue(form, key)) {
        fields[key] = { ...fields[key], visible: true, required: false }
      }
    }
  }

  return fields
}

export function getLinkSectionTitle(type: FinancialFormType): string {
  return type === 'receita' ? 'Vínculo com cliente' : 'Origem da despesa'
}

export function shouldShowPaymentDetails(form: FinancialFormState): boolean {
  return Boolean(form.payment_method)
}

const CLEARABLE_FIELDS = [
  'client_id',
  'order_id',
  'supplier_id',
  'purchase_id',
  'employee_id',
  'document_number',
  'installment_number',
  'installment_total',
  'payment_method',
] as const satisfies readonly FinancialFieldKey[]

type ClearableFieldKey = (typeof CLEARABLE_FIELDS)[number]

const HIDDEN_FIELD_DEFAULTS: Pick<FinancialFormState, ClearableFieldKey> = {
  client_id: '',
  order_id: '',
  supplier_id: '',
  purchase_id: '',
  employee_id: '',
  document_number: '',
  installment_number: '' as FinancialFormState['installment_number'],
  installment_total: '' as FinancialFormState['installment_total'],
  payment_method: '',
}

function resetClearableField<K extends ClearableFieldKey>(
  form: FinancialFormState,
  key: K,
): FinancialFormState {
  return { ...form, [key]: HIDDEN_FIELD_DEFAULTS[key] }
}

export function clearHiddenFinancialFields(
  form: FinancialFormState,
  fields: Record<FinancialFieldKey, FinancialFieldRule>,
): FinancialFormState {
  let next = form
  for (const key of CLEARABLE_FIELDS) {
    if (!fields[key].visible) {
      next = resetClearableField(next, key)
    }
  }
  return next
}

export function validateFinancialForm(
  form: FinancialFormState,
  fields: Record<FinancialFieldKey, FinancialFieldRule>,
): string | null {
  for (const [key, rule] of Object.entries(fields) as [FinancialFieldKey, FinancialFieldRule][]) {
    if (!rule.visible || !rule.required) continue
    const value = form[key]
    if (key === 'amount' && (!value || Number(value) <= 0)) {
      return 'Informe um valor válido'
    }
    if (key !== 'amount' && (value === '' || value === null || value === undefined)) {
      return `Preencha o campo: ${rule.label ?? key}`
    }
  }

  if (fields.description.visible && !form.description.trim()) {
    return 'Informe a descrição'
  }

  const instNum = form.installment_number === '' ? null : Number(form.installment_number)
  const instTotal = form.installment_total === '' ? null : Number(form.installment_total)
  if ((instNum && !instTotal) || (!instNum && instTotal)) {
    return 'Informe parcela e total de parcelas, ou deixe ambos vazios'
  }
  if (instNum && instTotal && instNum > instTotal) {
    return 'A parcela atual não pode ser maior que o total'
  }

  return null
}

export function sanitizeFinancialPayload(
  form: FinancialFormState,
  employeeName?: string,
): Record<string, unknown> {
  const fields = getFinancialFormFields(form)
  const description = fields.employee_id.visible && employeeName
    ? employeeName.trim()
    : form.description.trim()

  return {
    type: form.type,
    category: form.category,
    description,
    amount: Number(form.amount) || 0,
    due_date: fields.due_date.visible ? (form.due_date || null) : null,
    payment_method: fields.payment_method.visible && form.payment_method ? form.payment_method : null,
    notes: fields.notes.visible ? (form.notes.trim() || null) : null,
    client_id: fields.client_id.visible && form.client_id ? form.client_id : null,
    order_id: fields.order_id.visible && form.order_id ? form.order_id : null,
    purchase_id: fields.purchase_id.visible && form.purchase_id ? form.purchase_id : null,
    supplier_id: fields.supplier_id.visible && form.supplier_id ? form.supplier_id : null,
    employee_id: fields.employee_id.visible && form.employee_id ? form.employee_id : null,
    document_number: fields.document_number.visible ? (form.document_number.trim() || null) : null,
    installment_number: fields.installment_number.visible && form.installment_number !== ''
      ? Number(form.installment_number)
      : null,
    installment_total: fields.installment_total.visible && form.installment_total !== ''
      ? Number(form.installment_total)
      : null,
  }
}

export function applyFinancialFormContextChange(
  form: FinancialFormState,
  patch: Partial<FinancialFormState>,
): FinancialFormState {
  const next = { ...form, ...patch }
  const fields = getFinancialFormFields(next)
  return clearHiddenFinancialFields(next, fields)
}
