import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FINANCIAL_CATEGORIES,
  SELECT_NONE,
  getFinancialCategoryHint,
  PAYMENT_METHODS,
} from '@/lib/constants'
import {
  applyFinancialFormContextChange,
  getFinancialFormFields,
  getLinkSectionTitle,
  shouldShowPaymentDetails,
  type FinancialFormState,
  type FinancialFormType,
} from '@/lib/financial-form.schema'
import { formatCurrency } from '@/lib/utils'
import { EmployeeSelect, type EmployeePayrollOption } from '@/components/financial/EmployeeSelect'

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
interface LookupPurchase {
  id: string
  number: number
  description: string | null
  total_price: number
  supplier_id: string | null
  invoice_number: string | null
}
interface LookupSupplier { id: string; name: string }

interface FinancialTransactionFormProps {
  form: FinancialFormState
  setForm: React.Dispatch<React.SetStateAction<FinancialFormState>>
  onSubmit: () => void
  submitting: boolean
  editing: boolean
  clients: LookupClient[]
  orders: LookupOrder[]
  purchases: LookupPurchase[]
  suppliers: LookupSupplier[]
  employees: EmployeePayrollOption[]
}

export function FinancialTransactionForm({
  form,
  setForm,
  onSubmit,
  submitting,
  editing,
  clients,
  orders,
  purchases,
  suppliers,
  employees,
}: FinancialTransactionFormProps) {
  const fields = useMemo(
    () => getFinancialFormFields(form, { isEditing: editing }),
    [form, editing],
  )

  const categories = form.type === 'receita' ? FINANCIAL_CATEGORIES.receita : FINANCIAL_CATEGORIES.despesa

  const filteredOrders = useMemo(() => {
    if (!form.client_id) return orders
    return orders.filter((o) => o.client_id === form.client_id)
  }, [orders, form.client_id])

  const showLinkSection = fields.client_id.visible
    || fields.order_id.visible
    || fields.supplier_id.visible
    || fields.purchase_id.visible
    || (fields.document_number.visible && fields.document_number.section === 'link')

  const showPaymentDetails = shouldShowPaymentDetails(form)
    && (
      fields.document_number.visible
      || fields.installment_number.visible
      || fields.installment_total.visible
    )

  const sinalRemainingHint = useMemo(() => {
    if (form.type !== 'receita' || form.category !== 'sinal' || !form.order_id) return null
    const order = orders.find((o) => o.id === form.order_id)
    if (!order || !form.amount || form.amount <= 0) return null
    const remaining = Math.round((order.value - Number(form.amount)) * 100) / 100
    if (remaining <= 0) {
      return 'Valor cobre o pedido — nenhum saldo será lançado em A Receber'
    }
    return `Saldo a receber: ${formatCurrency(remaining)} (pedido ${formatCurrency(order.value)} − sinal)`
  }, [form.type, form.category, form.order_id, form.amount, orders])

  const patchForm = (patch: Partial<FinancialFormState>) => {
    setForm((current) => applyFinancialFormContextChange(current, patch))
  }

  return (
    <div className="space-y-4">
      <FormSection title="Tipo de lançamento">
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(v) => {
              const type = v as FinancialFormType
              patchForm({
                type,
                category: FINANCIAL_CATEGORIES[type][0].value,
                client_id: '',
                order_id: '',
                purchase_id: '',
                supplier_id: '',
                employee_id: '',
                description: '',
                payment_method: '',
                document_number: '',
                installment_number: '',
                installment_total: '',
              })
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Categoria</Label>
          <Select
            value={form.category}
            onValueChange={(v) => patchForm({
              category: v,
              client_id: '',
              order_id: '',
              purchase_id: '',
              supplier_id: '',
              employee_id: '',
              description: '',
            })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldHint text={getFinancialCategoryHint(form.type, form.category)} />
        </div>
      </FormSection>

      {showLinkSection && (
        <FormSection title={getLinkSectionTitle(form.type)}>
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
                  {!fields.client_id.required && <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>}
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldHint text={fields.client_id.hint} />
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
                  const patch: Partial<FinancialFormState> = {
                    order_id,
                    client_id: order ? order.client_id : form.client_id,
                  }
                  // Sinal: valor é a entrada; não preencher com o total do pedido.
                  if (order && !form.amount && form.category !== 'sinal') {
                    patch.amount = order.value
                  }
                  patchForm(patch)
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {!fields.order_id.required && <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>}
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

          {fields.supplier_id.visible && (
            <div>
              <Label>
                {fields.supplier_id.label}
                {fields.supplier_id.required && ' *'}
              </Label>
              <Select
                value={toSelectValue(form.supplier_id)}
                onValueChange={(v) => patchForm({ supplier_id: fromSelectValue(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldHint text={fields.supplier_id.hint} />
            </div>
          )}

          {fields.purchase_id.visible && (
            <div>
              <Label>
                {fields.purchase_id.label}
                {fields.purchase_id.required && ' *'}
              </Label>
              <Select
                value={toSelectValue(form.purchase_id)}
                onValueChange={(v) => {
                  const purchase_id = fromSelectValue(v)
                  const purchase = purchases.find((p) => p.id === purchase_id)
                  patchForm({
                    purchase_id,
                    supplier_id: purchase?.supplier_id ?? form.supplier_id,
                    document_number: purchase?.invoice_number || form.document_number,
                    amount: purchase && !form.amount ? purchase.total_price : form.amount,
                  })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Nenhuma</SelectItem>
                  {purchases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.number} — {p.description || 'Sem descrição'} ({formatCurrency(p.total_price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint text={fields.purchase_id.hint} />
            </div>
          )}

          {fields.document_number.visible && fields.document_number.section === 'link' && (
            <div>
              <Label>
                {fields.document_number.label}
                {fields.document_number.required && ' *'}
              </Label>
              <Input
                placeholder={fields.document_number.placeholder ?? 'Nota fiscal, recibo ou boleto'}
                value={form.document_number}
                onChange={(e) => setForm({ ...form, document_number: e.target.value })}
              />
              <FieldHint text={fields.document_number.hint} />
            </div>
          )}
        </FormSection>
      )}

      <FormSection title="Valores">
        {fields.employee_id.visible ? (
          <div>
            <Label>
              {fields.employee_id.label}
              {fields.employee_id.required && ' *'}
            </Label>
            <EmployeeSelect
              employees={employees}
              value={form.employee_id}
              onSelect={(employee) => {
                setForm((current) => ({
                  ...current,
                  employee_id: employee.id,
                  description: employee.name,
                  amount: employee.salary != null && employee.salary > 0 ? employee.salary : current.amount,
                }))
              }}
            />
            <FieldHint text={fields.employee_id.hint} />
          </div>
        ) : fields.description.visible && (
          <div>
            <Label>Descrição *</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={form.type === 'receita' ? 'Ex.: Sinal do projeto cozinha' : 'Ex.: Conta de energia março'}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valor *</Label>
            <CurrencyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
            {fields.employee_id.visible && (
              <FieldHint text="Preenchido com o salário cadastrado — altere se houver bonificação ou desconto" />
            )}
            {sinalRemainingHint && <FieldHint text={sinalRemainingHint} />}
          </div>
          {fields.due_date.visible && (
            <div>
              <Label>
                {fields.due_date.label}
                {fields.due_date.required && ' *'}
              </Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
              <FieldHint text={fields.due_date.hint} />
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Forma de pagamento">
        <div>
          <Label>{fields.payment_method.label}</Label>
          <Select
            value={toSelectValue(form.payment_method)}
            onValueChange={(v) => patchForm({
              payment_method: fromSelectValue(v),
              document_number: '',
              installment_number: '',
              installment_total: '',
            })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE}>Não informado</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {showPaymentDetails && (
          <>
            {fields.document_number.visible && fields.document_number.section === 'payment' && (
              <div>
                <Label>
                  {fields.document_number.label}
                  {fields.document_number.required && ' *'}
                </Label>
                <Input
                  placeholder={fields.document_number.placeholder ?? 'Nota fiscal, recibo ou boleto'}
                  value={form.document_number}
                  onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                />
                <FieldHint text={fields.document_number.hint} />
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
                      placeholder="Ex.: 12"
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

      {fields.notes.visible && (
        <div>
          <Label>{fields.notes.label}</Label>
          <Textarea
            placeholder={fields.notes.placeholder ?? 'Informações adicionais...'}
            className="min-h-[80px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      )}

      <Button onClick={onSubmit} className="w-full" disabled={submitting}>
        {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar'}
      </Button>
    </div>
  )
}
