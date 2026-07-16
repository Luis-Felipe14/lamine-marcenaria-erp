import type { LumberCreditMovementType } from '@/services/lumberyard-credit.service'
import type { LumberCreditMaterialOption } from '@/services/lookups.service'

export interface LumberCreditMaterialLine {
  material_id: string
  name: string
  specification?: string | null
  brand?: string | null
  unit: string
  unit_price: number
  quantity: number
  amount: number
  purchase_id?: string | null
  purchase_number?: number | null
}

export function formatMaterialLineDescription(line: Pick<LumberCreditMaterialLine, 'name' | 'brand' | 'specification'>): string {
  return [
    line.name,
    line.brand ? `Marca: ${line.brand}` : null,
    line.specification ? `Espec.: ${line.specification}` : null,
  ].filter(Boolean).join(' — ')
}

export interface LumberCreditFormState {
  movement_type: LumberCreditMovementType
  amount: number
  movement_date: string
  client_id: string
  order_id: string
  supplier_id: string
  material_id: string
  material_description: string
  material_lines: LumberCreditMaterialLine[]
  quantity: number | ''
  invoice_number: string
  installment_number: number | ''
  installment_total: number | ''
  payment_method: string
  notes: string
  auto_sync: boolean
}

export type LumberCreditFieldKey =
  | 'client_id'
  | 'order_id'
  | 'supplier_id'
  | 'material_id'
  | 'material_description'
  | 'quantity'
  | 'invoice_number'
  | 'payment_method'
  | 'installment_number'
  | 'installment_total'
  | 'notes'
  | 'amount'
  | 'movement_date'

export interface LumberCreditFieldRule {
  visible: boolean
  required: boolean
  label?: string
  placeholder?: string
  hint?: string
  section?: 'link' | 'payment' | 'material' | 'core' | 'notes' | 'reference'
}

export function computeMaterialLineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}

export function createMaterialLineFromOption(material: LumberCreditMaterialOption): LumberCreditMaterialLine {
  const quantity = 1
  const unit_price = material.unit_cost
  return {
    material_id: material.id,
    name: material.name,
    specification: material.specification,
    brand: material.brand,
    unit: material.unit,
    unit_price,
    quantity,
    amount: computeMaterialLineAmount(quantity, unit_price),
  }
}

export function applyMaterialLinePatch(
  line: LumberCreditMaterialLine,
  patch: Partial<LumberCreditMaterialLine>,
): LumberCreditMaterialLine {
  const next = { ...line, ...patch }

  if (patch.quantity !== undefined || patch.unit_price !== undefined) {
    next.amount = computeMaterialLineAmount(next.quantity, next.unit_price)
  } else if (patch.amount !== undefined && next.quantity > 0) {
    next.unit_price = Math.round((next.amount / next.quantity) * 100) / 100
  }

  return next
}

export function computeSaidaTotalAmount(form: LumberCreditFormState): number {
  if (form.material_lines.length > 0) {
    return form.material_lines.reduce((sum, line) => sum + Number(line.amount), 0)
  }
  return Number(form.amount) || 0
}

export function withSaidaAmountFromLines(form: LumberCreditFormState): LumberCreditFormState {
  if (form.movement_type !== 'saida' || form.material_lines.length === 0) return form
  return { ...form, amount: computeSaidaTotalAmount(form) }
}

export function createEmptyLumberCreditForm(
  movementType: LumberCreditMovementType = 'entrada',
): LumberCreditFormState {
  return {
    movement_type: movementType,
    amount: 0,
    movement_date: new Date().toISOString().split('T')[0],
    client_id: '',
    order_id: '',
    supplier_id: '',
    material_id: '',
    material_description: '',
    material_lines: [],
    quantity: '',
    invoice_number: '',
    installment_number: '',
    installment_total: '',
    payment_method: movementType === 'entrada' ? 'cartao' : '',
    notes: '',
    auto_sync: movementType === 'saida',
  }
}

function entradaPaymentRules(method: string): Partial<Record<LumberCreditFieldKey, Omit<LumberCreditFieldRule, 'visible'> & { visible?: boolean }>> {
  switch (method) {
    case 'cartao':
      return {
        installment_total: {
          visible: true,
          required: false,
          label: 'Total de parcelas',
          section: 'payment',
          hint: 'Opcional — em quantas vezes o cliente parcelou no cartão (ex.: 10x → informe 10)',
        },
        invoice_number: {
          visible: true,
          required: false,
          label: 'Nº autorização / NF',
          section: 'payment',
          placeholder: 'Opcional — comprovante ou autorização',
        },
        notes: {
          visible: true,
          required: false,
          placeholder: 'Bandeira, final do cartão, combinado com a madereira...',
          section: 'notes',
        },
      }
    case 'boleto':
      return {
        invoice_number: {
          visible: true,
          required: true,
          label: 'Nº boleto / NF',
          section: 'payment',
          placeholder: 'Linha digitável ou número da NF',
        },
        notes: {
          visible: true,
          required: false,
          placeholder: 'Banco emissor, vencimento combinado...',
          section: 'notes',
        },
      }
    case 'pix':
      return {
        invoice_number: {
          visible: true,
          required: false,
          label: 'Referência / comprovante',
          section: 'payment',
          placeholder: 'ID da transação ou NF',
        },
        notes: {
          visible: true,
          required: false,
          placeholder: 'Chave PIX, comprovante, responsável...',
          section: 'notes',
        },
      }
    case 'transferencia':
      return {
        invoice_number: {
          visible: true,
          required: false,
          label: 'Referência / NF',
          section: 'payment',
        },
        notes: {
          visible: true,
          required: false,
          placeholder: 'Banco, titular, comprovante...',
          section: 'notes',
        },
      }
    case 'dinheiro':
      return {
        notes: {
          visible: true,
          required: false,
          placeholder: 'Quem recebeu ou repassou o valor...',
          section: 'notes',
        },
      }
    case 'outros':
      return {
        invoice_number: {
          visible: true,
          required: false,
          label: 'Referência',
          section: 'payment',
        },
        notes: {
          visible: true,
          required: false,
          placeholder: 'Detalhes da forma de pagamento...',
          section: 'notes',
        },
      }
    default:
      return {}
  }
}

const CORE_RULES: Record<LumberCreditFieldKey, LumberCreditFieldRule> = {
  amount: { visible: true, required: true, label: 'Valor', section: 'core' },
  movement_date: { visible: true, required: true, label: 'Data', section: 'core' },
  client_id: { visible: false, required: false, label: 'Cliente', section: 'link' },
  order_id: { visible: false, required: false, label: 'Pedido (opcional)', section: 'link', hint: 'Vincule ao pedido do cliente, se houver' },
  payment_method: { visible: false, required: false, label: 'Forma de pagamento', section: 'payment' },
  installment_number: { visible: false, required: false, label: 'Parcela atual', section: 'payment' },
  installment_total: { visible: false, required: false, label: 'Total de parcelas', section: 'payment' },
  supplier_id: { visible: false, required: false, label: 'Madereira / Fornecedor', section: 'material' },
  material_id: { visible: false, required: false, label: 'Material cadastrado', section: 'material' },
  material_description: { visible: false, required: false, label: 'Descrição avulsa', section: 'material' },
  quantity: { visible: false, required: false, label: 'Quantidade', section: 'material' },
  invoice_number: { visible: false, required: false, label: 'Nº NF / referência', section: 'reference' },
  notes: { visible: true, required: false, label: 'Observações', section: 'notes' },
}

function hasFieldValue(form: LumberCreditFormState, key: LumberCreditFieldKey): boolean {
  const value = form[key]
  if (value === '' || value === 0) return false
  return true
}

export function getLumberCreditFormFields(
  form: LumberCreditFormState,
  options: { isEditing?: boolean; allowCrossClient?: boolean } = {},
): Record<LumberCreditFieldKey, LumberCreditFieldRule> {
  const { isEditing = false, allowCrossClient = false } = options
  const fields = { ...CORE_RULES }
  const hasMaterialLines = form.material_lines.length > 0

  if (form.movement_type === 'entrada') {
    fields.client_id = { ...fields.client_id, visible: true, required: true }
    fields.order_id = { ...fields.order_id, visible: true, required: false }
    fields.payment_method = { ...fields.payment_method, visible: true, required: true }

    if (form.payment_method) {
      for (const [key, rule] of Object.entries(entradaPaymentRules(form.payment_method)) as [LumberCreditFieldKey, LumberCreditFieldRule][]) {
        fields[key] = { ...fields[key], ...rule, visible: rule.visible ?? true }
      }
    }
  } else if (isEditing) {
    fields.client_id = {
      ...fields.client_id,
      visible: true,
      required: true,
      hint: allowCrossClient
        ? 'Selecione de qual cliente o crédito será utilizado'
        : 'A saída consome apenas o saldo deste cliente',
    }
    fields.supplier_id = { ...fields.supplier_id, visible: true, required: false }
    fields.material_id = { ...fields.material_id, visible: true, required: false }
    fields.material_description = {
      ...fields.material_description,
      visible: true,
      required: !form.material_id,
      placeholder: 'Ex.: MDF 18mm — 12 chapas',
      hint: form.material_id ? 'Preenchido pelo material selecionado — pode ajustar' : 'Obrigatório se não houver material cadastrado',
    }
    fields.quantity = {
      ...fields.quantity,
      visible: Boolean(form.material_id),
      required: false,
      hint: 'Usada na compra automática e no estoque',
    }
    fields.invoice_number = {
      ...fields.invoice_number,
      visible: true,
      required: false,
      label: 'Nº NF / referência',
      section: 'reference',
    }
    fields.notes = {
      ...fields.notes,
      placeholder: 'Combinado com a madereira, responsável, etc.',
    }
  } else {
    fields.client_id = {
      ...fields.client_id,
      visible: true,
      required: true,
      hint: allowCrossClient
        ? 'Selecione de qual cliente o crédito será utilizado'
        : 'A saída consome apenas o saldo deste cliente',
    }
    fields.supplier_id = { ...fields.supplier_id, visible: true, required: false }
    fields.material_description = {
      ...fields.material_description,
      visible: !hasMaterialLines,
      required: !hasMaterialLines,
      placeholder: 'Ex.: MDF 18mm — 12 chapas',
      hint: 'Use apenas quando não houver material cadastrado no estoque',
    }
    fields.invoice_number = {
      ...fields.invoice_number,
      visible: true,
      required: false,
      label: 'Nº NF / referência',
      section: 'reference',
    }
    fields.notes = {
      ...fields.notes,
      placeholder: 'Combinado com a madereira, responsável, etc.',
    }
    fields.amount = {
      ...fields.amount,
      label: hasMaterialLines ? 'Valor total da operação' : 'Valor',
      hint: hasMaterialLines ? 'Soma automática dos materiais selecionados' : undefined,
    }
  }

  if (isEditing) {
    for (const key of Object.keys(fields) as LumberCreditFieldKey[]) {
      if (!fields[key].visible && hasFieldValue(form, key)) {
        fields[key] = { ...fields[key], visible: true, required: false }
      }
    }
  }

  return fields
}

export function shouldShowEntradaPaymentDetails(form: LumberCreditFormState): boolean {
  return form.movement_type === 'entrada' && Boolean(form.payment_method)
}

export function getEntradaLinkSectionTitle(): string {
  return 'Cliente e pedido'
}

export function getSaidaLinkSectionTitle(): string {
  return 'Cliente do crédito'
}

export function getSaidaMaterialSectionTitle(): string {
  return 'Material retirado'
}

const CLEARABLE_FIELDS = [
  'client_id',
  'order_id',
  'supplier_id',
  'material_id',
  'material_description',
  'quantity',
  'invoice_number',
  'installment_number',
  'installment_total',
  'payment_method',
] as const satisfies readonly LumberCreditFieldKey[]

type ClearableFieldKey = (typeof CLEARABLE_FIELDS)[number]

const HIDDEN_FIELD_DEFAULTS: Pick<LumberCreditFormState, ClearableFieldKey> = {
  client_id: '',
  order_id: '',
  supplier_id: '',
  material_id: '',
  material_description: '',
  quantity: '',
  invoice_number: '',
  installment_number: '',
  installment_total: '',
  payment_method: '',
}

function resetClearableField<K extends ClearableFieldKey>(
  form: LumberCreditFormState,
  key: K,
): LumberCreditFormState {
  return { ...form, [key]: HIDDEN_FIELD_DEFAULTS[key] }
}

export function clearHiddenLumberCreditFields(
  form: LumberCreditFormState,
  fields: Record<LumberCreditFieldKey, LumberCreditFieldRule>,
): LumberCreditFormState {
  let next = form
  for (const key of CLEARABLE_FIELDS) {
    if (!fields[key].visible) {
      next = resetClearableField(next, key)
    }
  }
  return next
}

export function validateLumberCreditForm(
  form: LumberCreditFormState,
  fields: Record<LumberCreditFieldKey, LumberCreditFieldRule>,
  options: { isEditing?: boolean } = {},
): string | null {
  const { isEditing = false } = options

  for (const [key, rule] of Object.entries(fields) as [LumberCreditFieldKey, LumberCreditFieldRule][]) {
    if (!rule.visible || !rule.required) continue
    const value = form[key]
    if (key === 'amount' && (!value || Number(value) <= 0)) {
      return 'Informe um valor válido'
    }
    if (key === 'material_description' && !String(value).trim()) {
      return 'Informe a descrição do material ou selecione itens cadastrados'
    }
    if (key !== 'amount' && key !== 'material_description' && (value === '' || value === null || value === undefined)) {
      return `Preencha o campo: ${rule.label ?? key}`
    }
  }

  if (form.movement_type === 'saida' && !isEditing) {
    if (form.material_lines.length > 0) {
      if (form.material_lines.some((line) => line.quantity <= 0)) {
        return 'Informe quantidade válida em todos os materiais'
      }
      if (form.material_lines.some((line) => line.amount <= 0)) {
        return 'Informe valor válido em todos os materiais'
      }
    } else if (!form.material_description.trim()) {
      return 'Adicione materiais cadastrados ou informe a descrição avulsa'
    }
  }

  if (form.movement_type === 'saida' && isEditing && !form.material_id && !form.material_description.trim()) {
    return 'Informe o material ou a descrição na saída'
  }

  const instNum = form.installment_number === '' ? null : Number(form.installment_number)
  const instTotal = form.installment_total === '' ? null : Number(form.installment_total)
  if (fields.installment_total.visible && instTotal !== null && instTotal < 1) {
    return 'Total de parcelas inválido'
  }
  if (fields.installment_number.visible && fields.installment_total.visible) {
    if ((instNum && !instTotal) || (!instNum && instTotal)) {
      return 'Informe parcela e total de parcelas, ou deixe ambos vazios'
    }
    if (instNum && instTotal && instNum > instTotal) {
      return 'A parcela atual não pode ser maior que o total'
    }
  }

  return null
}

export function sanitizeLumberCreditPayload(form: LumberCreditFormState) {
  const fields = getLumberCreditFormFields(form)

  return {
    movement_type: form.movement_type,
    amount: Number(form.amount) || 0,
    movement_date: form.movement_date,
    client_id: fields.client_id.visible && form.client_id ? form.client_id : null,
    order_id: fields.order_id.visible && form.order_id ? form.order_id : null,
    supplier_id: fields.supplier_id.visible && form.supplier_id ? form.supplier_id : null,
    material_id: fields.material_id.visible && form.material_id ? form.material_id : null,
    material_description: fields.material_description.visible
      ? (form.material_description.trim() || null)
      : null,
    quantity: fields.quantity.visible && form.quantity !== '' ? Number(form.quantity) : null,
    invoice_number: fields.invoice_number.visible ? (form.invoice_number.trim() || null) : null,
    installment_number: fields.installment_number.visible && form.installment_number !== ''
      ? Number(form.installment_number)
      : null,
    installment_total: fields.installment_total.visible && form.installment_total !== ''
      ? Number(form.installment_total)
      : null,
    payment_method: fields.payment_method.visible && form.payment_method ? form.payment_method : null,
    notes: fields.notes.visible ? (form.notes.trim() || null) : null,
  }
}

export function buildLumberCreditSaidaPayload(form: LumberCreditFormState) {
  const base = sanitizeLumberCreditPayload(form)
  const material_lines: LumberCreditMaterialLine[] = form.material_lines.map((line) => ({
    material_id: line.material_id,
    name: line.name,
    specification: line.specification,
    brand: line.brand,
    unit: line.unit,
    unit_price: line.unit_price,
    quantity: line.quantity,
    amount: line.amount,
  }))

  const singleLine = material_lines.length === 1 ? material_lines[0] : null

  return {
    ...base,
    amount: computeSaidaTotalAmount(form),
    material_id: singleLine?.material_id ?? null,
    material_description: singleLine
      ? formatMaterialLineDescription(singleLine)
      : `Retirada de ${material_lines.length} materiais`,
    quantity: singleLine?.quantity ?? null,
    material_lines,
  }
}

export function applyLumberCreditFormContextChange(
  form: LumberCreditFormState,
  patch: Partial<LumberCreditFormState>,
): LumberCreditFormState {
  const next = withSaidaAmountFromLines({ ...form, ...patch })
  const fields = getLumberCreditFormFields(next)
  return clearHiddenLumberCreditFields(next, fields)
}
