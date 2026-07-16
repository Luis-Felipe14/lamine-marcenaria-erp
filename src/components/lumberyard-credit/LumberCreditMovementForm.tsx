import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Package, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LUMBER_CREDIT_MOVEMENT_TYPES, PAYMENT_METHODS, SELECT_NONE } from '@/lib/constants'
import {
  applyLumberCreditFormContextChange,
  applyMaterialLinePatch,
  computeSaidaTotalAmount,
  createEmptyLumberCreditForm,
  createMaterialLineFromOption,
  getEntradaLinkSectionTitle,
  getLumberCreditFormFields,
  getSaidaLinkSectionTitle,
  getSaidaMaterialSectionTitle,
  shouldShowEntradaPaymentDetails,
  withSaidaAmountFromLines,
  type LumberCreditFormState,
} from '@/lib/lumberyard-credit-form.schema'
import { formatCurrency } from '@/lib/utils'
import type { LumberCreditMovement, LumberCreditMovementType } from '@/services/lumberyard-credit.service'
import type { LumberCreditMaterialOption } from '@/services/lookups.service'
import type { Supplier } from '@/services/suppliers.service'
import { LumberCreditMaterialPickerDialog } from '@/components/lumberyard-credit/LumberCreditMaterialPickerDialog'
import { SupplierQuickCreateDialog } from '@/components/lumberyard-credit/SupplierQuickCreateDialog'

function toSelectValue(id: string) {
  return id || SELECT_NONE
}

function fromSelectValue(value: string) {
  return value === SELECT_NONE ? '' : value
}

function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      {title && <p className="text-xs font-medium uppercase tracking-wide text-gold/80">{title}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FieldHint({ text }: { text?: string }) {
  if (!text) return null
  return <p className="mt-1 text-xs text-gray-500">{text}</p>
}

interface LookupClient { id: string; name: string }
interface LookupOrder { id: string; number: number; value: number; client_id: string }
interface LookupSupplier { id: string; name: string }
interface LookupMaterial { id: string; name: string }

interface LumberCreditMovementFormProps {
  form: LumberCreditFormState
  setForm: React.Dispatch<React.SetStateAction<LumberCreditFormState>>
  onSubmit: () => void
  submitting: boolean
  editing: LumberCreditMovement | null
  clients: LookupClient[]
  orders: LookupOrder[]
  suppliers: LookupSupplier[]
  materials: LookupMaterial[]
  allowCrossClient?: boolean
  clientBalances?: Array<{ client_id: string; balance: number }>
  onSupplierCreated?: (supplier: Supplier) => void
}

export function LumberCreditMovementForm({
  form,
  setForm,
  onSubmit,
  submitting,
  editing,
  clients,
  orders,
  suppliers,
  materials,
  allowCrossClient = false,
  clientBalances = [],
  onSupplierCreated,
}: LumberCreditMovementFormProps) {
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)

  const fields = useMemo(
    () => getLumberCreditFormFields(form, { isEditing: Boolean(editing), allowCrossClient }),
    [form, editing, allowCrossClient],
  )

  const filteredOrders = useMemo(() => {
    if (!form.client_id) return orders
    return orders.filter((o) => o.client_id === form.client_id)
  }, [orders, form.client_id])

  const showEntradaLink = form.movement_type === 'entrada' && (fields.client_id.visible || fields.order_id.visible)
  const showSaidaLink = form.movement_type === 'saida' && fields.client_id.visible
  const showPaymentDetails = shouldShowEntradaPaymentDetails(form)
    && (
      fields.installment_number.visible
      || fields.installment_total.visible
      || (fields.invoice_number.visible && fields.invoice_number.section === 'payment')
    )
  const showReferenceField = fields.invoice_number.visible && fields.invoice_number.section === 'reference'
  const showMaterialSection = fields.supplier_id.visible
    || fields.material_id.visible
    || fields.material_description.visible
    || fields.quantity.visible
    || (!editing && form.movement_type === 'saida')

  const saidaUsesMaterialLines = form.movement_type === 'saida' && !editing
  const saidaAmountLocked = saidaUsesMaterialLines && form.material_lines.length > 0

  const patchForm = (patch: Partial<LumberCreditFormState>) => {
    setForm((current) => applyLumberCreditFormContextChange(current, patch))
  }

  const handleMaterialsConfirm = (materials: LumberCreditMaterialOption[]) => {
    const existing = new Map(form.material_lines.map((line) => [line.material_id, line]))
    const nextLines = [...form.material_lines]

    for (const material of materials) {
      if (existing.has(material.id)) continue
      nextLines.push(createMaterialLineFromOption(material))
    }

    patchForm(withSaidaAmountFromLines({
      ...form,
      material_lines: nextLines,
      material_description: '',
      material_id: '',
      quantity: '',
    }))
  }

  const updateMaterialLine = (materialId: string, patch: Partial<LumberCreditFormState['material_lines'][number]>) => {
    const material_lines = form.material_lines.map((line) => (
      line.material_id === materialId ? applyMaterialLinePatch(line, patch) : line
    ))
    patchForm(withSaidaAmountFromLines({ ...form, material_lines }))
  }

  const removeMaterialLine = (materialId: string) => {
    patchForm(withSaidaAmountFromLines({
      ...form,
      material_lines: form.material_lines.filter((line) => line.material_id !== materialId),
    }))
  }

  return (
    <div className="space-y-4">
      <FormSection title="Tipo de movimentação">
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.movement_type}
            onValueChange={(v) => {
              const movement_type = v as LumberCreditMovementType
              patchForm({
                ...createEmptyLumberCreditForm(movement_type),
                movement_date: form.movement_date,
                amount: form.amount,
              })
            }}
            disabled={Boolean(editing)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LUMBER_CREDIT_MOVEMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint text={LUMBER_CREDIT_MOVEMENT_TYPES.find((t) => t.value === form.movement_type)?.hint} />
        </div>
      </FormSection>

      <FormSection title="Valores">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{fields.amount.label}{fields.amount.required && ' *'}</Label>
            <CurrencyInput
              value={saidaAmountLocked ? computeSaidaTotalAmount(form) : form.amount}
              onChange={(amount) => setForm({ ...form, amount })}
              disabled={saidaAmountLocked}
            />
            {fields.amount.hint ? <FieldHint text={fields.amount.hint} /> : null}
          </div>
          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={form.movement_date}
              onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
            />
          </div>
        </div>
      </FormSection>

      {showEntradaLink && (
        <FormSection title={getEntradaLinkSectionTitle()}>
          {fields.client_id.visible && (
            <div>
              <Label>
                {fields.client_id.label}
                {fields.client_id.required && ' *'}
              </Label>
              <Select
                value={toSelectValue(form.client_id)}
                onValueChange={(v) => {
                  const client_id = fromSelectValue(v)
                  patchForm({
                    client_id,
                    order_id: client_id && form.order_id
                      ? (orders.find((o) => o.id === form.order_id)?.client_id === client_id ? form.order_id : '')
                      : '',
                  })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {fields.order_id.visible && (
            <div>
              <Label>
                {fields.order_id.label}
                {fields.order_id.required && ' *'}
              </Label>
              <Select
                value={toSelectValue(form.order_id)}
                onValueChange={(v) => {
                  const order_id = fromSelectValue(v)
                  const order = orders.find((o) => o.id === order_id)
                  patchForm({
                    order_id,
                    client_id: order ? order.client_id : form.client_id,
                  })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                  {filteredOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      #{o.number} — {formatCurrency(o.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint text={fields.order_id.hint} />
            </div>
          )}
        </FormSection>
      )}

      {showSaidaLink && (
        <FormSection title={getSaidaLinkSectionTitle()}>
          <div>
            <Label>
              {fields.client_id.label}
              {fields.client_id.required && ' *'}
            </Label>
            <Select
              value={toSelectValue(form.client_id)}
              onValueChange={(v) => patchForm({ client_id: fromSelectValue(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => {
                  const balance = clientBalances.find((row) => row.client_id === c.id)?.balance
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {balance !== undefined ? ` — ${formatCurrency(balance)}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <FieldHint text={fields.client_id.hint} />
          </div>
        </FormSection>
      )}

      {fields.payment_method.visible && (
        <FormSection title="Forma de pagamento">
          <div>
            <Label>
              {fields.payment_method.label}
              {fields.payment_method.required && ' *'}
            </Label>
            <Select
              value={form.payment_method || 'cartao'}
              onValueChange={(v) => patchForm({
                payment_method: v,
                installment_number: '',
                installment_total: '',
                invoice_number: '',
              })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {showPaymentDetails && (
            <>
              {fields.invoice_number.visible && fields.invoice_number.section === 'payment' && (
                <div>
                  <Label>
                    {fields.invoice_number.label}
                    {fields.invoice_number.required && ' *'}
                  </Label>
                  <Input
                    placeholder={fields.invoice_number.placeholder ?? 'Referência ou NF'}
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  />
                  <FieldHint text={fields.invoice_number.hint} />
                </div>
              )}

              {(fields.installment_number.visible || fields.installment_total.visible) && (
                <div className={fields.installment_number.visible && fields.installment_total.visible ? 'grid grid-cols-2 gap-4' : undefined}>
                  {fields.installment_number.visible && (
                    <div>
                      <Label>
                        {fields.installment_number.label}
                        {fields.installment_number.required && ' *'}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex.: 2"
                        value={form.installment_number}
                        onChange={(e) => setForm({
                          ...form,
                          installment_number: e.target.value === '' ? '' : Number(e.target.value),
                        })}
                      />
                      <FieldHint text={fields.installment_number.hint} />
                    </div>
                  )}
                  {fields.installment_total.visible && (
                    <div>
                      <Label>
                        {fields.installment_total.label}
                        {fields.installment_total.required && ' *'}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Opcional — ex.: 10"
                        value={form.installment_total}
                        onChange={(e) => setForm({
                          ...form,
                          installment_total: e.target.value === '' ? '' : Number(e.target.value),
                        })}
                      />
                      <FieldHint text={fields.installment_total.hint} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </FormSection>
      )}

      {showMaterialSection && (
        <FormSection title={getSaidaMaterialSectionTitle()}>
          {fields.supplier_id.visible && (
            <div className="space-y-2">
              <Label>{fields.supplier_id.label}</Label>
              <div className="flex gap-2">
                <Select
                  value={toSelectValue(form.supplier_id)}
                  onValueChange={(v) => patchForm({ supplier_id: fromSelectValue(v) })}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Não informado</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setSupplierDialogOpen(true)} title="Novo fornecedor">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {saidaUsesMaterialLines ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Materiais cadastrados</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setMaterialPickerOpen(true)}>
                  <Package className="mr-2 h-4 w-4" />
                  Selecionar materiais
                </Button>
              </div>

              {form.material_lines.length > 0 ? (
                <div className="space-y-2">
                  {form.material_lines.map((line) => (
                    <div key={line.material_id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-white">{line.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {line.brand ? `Marca: ${line.brand}` : 'Marca não informada'}
                            {line.specification ? ` · ${line.specification}` : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeMaterialLine(line.material_id)}
                          title="Remover material"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <Label>Quantidade ({line.unit})</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.001}
                            value={line.quantity}
                            onChange={(e) => updateMaterialLine(line.material_id, {
                              quantity: Number(e.target.value) || 0,
                            })}
                          />
                        </div>
                        <div>
                          <Label>Preço unitário</Label>
                          <CurrencyInput
                            value={line.unit_price}
                            onChange={(unit_price) => updateMaterialLine(line.material_id, { unit_price })}
                          />
                        </div>
                        <div>
                          <Label>Valor</Label>
                          <CurrencyInput value={line.amount} onChange={() => undefined} disabled />
                          <FieldHint text="Calculado: quantidade × preço unitário" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-right text-sm text-gold">
                    Total dos materiais: {formatCurrency(computeSaidaTotalAmount(form))}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Selecione um ou mais materiais do estoque ou use a descrição avulsa abaixo.
                </p>
              )}
            </div>
          ) : null}

          {fields.material_id.visible && (
            <div>
              <Label>{fields.material_id.label}</Label>
              <Select
                value={toSelectValue(form.material_id)}
                onValueChange={(v) => {
                  const material_id = fromSelectValue(v)
                  const mat = materials.find((m) => m.id === material_id)
                  patchForm({
                    material_id,
                    material_description: mat ? mat.name : '',
                    quantity: material_id ? form.quantity : '',
                  })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                  {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {fields.material_description.visible && (
            <div>
              <Label>
                {fields.material_description.label}
                {fields.material_description.required && ' *'}
              </Label>
              <Input
                placeholder={fields.material_description.placeholder}
                value={form.material_description}
                onChange={(e) => setForm({ ...form, material_description: e.target.value })}
              />
              <FieldHint text={fields.material_description.hint} />
            </div>
          )}

          {fields.quantity.visible && (
            <div>
              <Label>{fields.quantity.label}</Label>
              <Input
                type="number"
                min={0}
                step={0.001}
                value={form.quantity}
                onChange={(e) => setForm({
                  ...form,
                  quantity: e.target.value === '' ? '' : Number(e.target.value),
                })}
              />
              <FieldHint text={fields.quantity.hint} />
            </div>
          )}
        </FormSection>
      )}

      {showReferenceField && (
        <div>
          <Label>
            {fields.invoice_number.label}
            {fields.invoice_number.required && ' *'}
          </Label>
          <Input
            placeholder={fields.invoice_number.placeholder ?? 'Nota fiscal ou referência'}
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
          />
        </div>
      )}

      {fields.notes.visible && (
        <div>
          <Label>{fields.notes.label}</Label>
          <Textarea
            className="min-h-[80px]"
            placeholder={fields.notes.placeholder ?? 'Informações adicionais...'}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      )}

      {form.movement_type === 'saida' && !editing && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          <input
            type="checkbox"
            checked={form.auto_sync}
            onChange={(e) => setForm({ ...form, auto_sync: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Registrar compra recebida e dar entrada no estoque</span>
            <span className="mt-1 block text-xs text-gray-500">
              {form.material_lines.length > 0
                ? 'Será criada uma compra por material selecionado, com status recebido.'
                : 'Selecione materiais cadastrados para atualizar o estoque automaticamente.'}
            </span>
          </span>
        </label>
      )}

      {editing?.purchase?.number && (
        <p className="text-sm text-gray-400">
          Vinculada à{' '}
          <Link to="/compras" className="text-gold hover:underline">
            Compra #{editing.purchase.number}
          </Link>
        </p>
      )}

      <Button onClick={onSubmit} className="w-full" disabled={submitting}>
        {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar'}
      </Button>

      <LumberCreditMaterialPickerDialog
        open={materialPickerOpen}
        onOpenChange={setMaterialPickerOpen}
        selectedIds={form.material_lines.map((line) => line.material_id)}
        onConfirm={handleMaterialsConfirm}
      />

      <SupplierQuickCreateDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(supplier) => {
          onSupplierCreated?.(supplier)
          patchForm({ supplier_id: supplier.id })
        }}
      />
    </div>
  )
}
