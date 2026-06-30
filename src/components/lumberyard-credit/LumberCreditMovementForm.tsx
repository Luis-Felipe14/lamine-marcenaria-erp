import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LUMBER_CREDIT_MOVEMENT_TYPES, PAYMENT_METHODS, SELECT_NONE } from '@/lib/constants'
import {
  applyLumberCreditFormContextChange,
  createEmptyLumberCreditForm,
  getEntradaLinkSectionTitle,
  getLumberCreditFormFields,
  getSaidaMaterialSectionTitle,
  shouldShowEntradaPaymentDetails,
  type LumberCreditFormState,
} from '@/lib/lumberyard-credit-form.schema'
import { formatCurrency } from '@/lib/utils'
import type { LumberCreditMovement, LumberCreditMovementType } from '@/services/lumberyard-credit.service'

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
}: LumberCreditMovementFormProps) {
  const fields = useMemo(
    () => getLumberCreditFormFields(form, { isEditing: Boolean(editing) }),
    [form, editing],
  )

  const filteredOrders = useMemo(() => {
    if (!form.client_id) return orders
    return orders.filter((o) => o.client_id === form.client_id)
  }, [orders, form.client_id])

  const showEntradaLink = fields.client_id.visible || fields.order_id.visible
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

  const patchForm = (patch: Partial<LumberCreditFormState>) => {
    setForm((current) => applyLumberCreditFormContextChange(current, patch))
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
            <Label>Valor *</Label>
            <CurrencyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
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
                <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Ex.: 10"
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
            <div>
              <Label>{fields.supplier_id.label}</Label>
              <Select
                value={toSelectValue(form.supplier_id)}
                onValueChange={(v) => patchForm({ supplier_id: fromSelectValue(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Não informado</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

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
              {form.material_id
                ? 'Será criada uma compra com status recebido e o material entrará no almoxarifado.'
                : 'Selecione um material cadastrado para atualizar o estoque automaticamente.'}
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
    </div>
  )
}
