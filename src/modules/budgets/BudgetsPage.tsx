import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, FileDown, Trash2, Pencil, X, Loader2, Layers, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageContent, PageDataZone } from '@/components/shared/PageLayout'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { TableToolbar } from '@/components/shared/TableToolbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { BUDGET_STATUSES, getBudgetStatusLabel } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { downloadBudgetProposalPdf } from '@/services/budget-pdf.service'
import {
  uploadBudgetEnvironmentImage,
  validateBudgetEnvironmentImage,
} from '@/services/budget-environment-images.service'
import {
  DEFAULT_COMMERCIAL_TERMS,
  DEFAULT_ENTRADA_PERCENT,
  DEFAULT_INSTALLATION_TIMELINE,
  DEFAULT_MANUFACTURING_TIMELINE,
} from '@/pdf/defaults'
import { useConfirm } from '@/hooks/useConfirm'
import { useBudgets, useLookupClients } from '@/hooks/useQueries'
import type { Budget } from '@/services/budgets.service'

interface BudgetItemForm {
  description: string
  specifications: string
  quantity: number
  unit_price: number
}

interface BudgetEnvironmentForm {
  id?: string
  name: string
  description: string
  image_url: string | null
  imageFile: File | null
  imagePreview: string | null
  items: BudgetItemForm[]
}

const emptyItem = (): BudgetItemForm => ({
  description: '',
  specifications: '',
  quantity: 1,
  unit_price: 0,
})

const emptyEnvironment = (name = 'Sala'): BudgetEnvironmentForm => ({
  name,
  description: '',
  image_url: null,
  imageFile: null,
  imagePreview: null,
  items: [emptyItem()],
})

const emptyForm = () => ({
  client_id: '',
  project_name: '',
  measurements: '',
  discount: 0,
  notes: '',
  commercial_terms: DEFAULT_COMMERCIAL_TERMS,
  entrada_percent: DEFAULT_ENTRADA_PERCENT,
  manufacturing_timeline: DEFAULT_MANUFACTURING_TIMELINE,
  installation_timeline: DEFAULT_INSTALLATION_TIMELINE,
  environments: [emptyEnvironment()],
})

const BUDGET_LOCKED_STATUSES = ['convertido_pedido', 'aprovado'] as const

function environmentSellingTotal(env: BudgetEnvironmentForm) {
  return env.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}

function projectSellingTotal(environments: BudgetEnvironmentForm[]) {
  return environments.reduce((sum, env) => sum + environmentSellingTotal(env), 0)
}

function flattenValidItems(environments: BudgetEnvironmentForm[]) {
  return environments.flatMap((env) =>
    env.items
      .filter((item) => item.description.trim())
      .map((item) => ({ env, item })),
  )
}

export function BudgetsPage() {
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const { data: listResult, isLoading: loading, isFetching } = useBudgets(page)
  const budgets = listResult?.data ?? []
  const totalPages = listResult?.totalPages ?? 1
  const { data: clients = [] } = useLookupClients()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfBudget, setPdfBudget] = useState<Budget | null>(null)
  const [pdfExporting, setPdfExporting] = useState(false)

  const refreshBudgets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['budgets'] })
  }, [queryClient])

  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (leadId) {
      setEditing(null)
      setForm(emptyForm())
      setDialogOpen(true)
    }
  }, [searchParams])

  const calculateTotal = () => projectSellingTotal(form.environments) - form.discount

  const isBudgetLocked = (status: string) =>
    (BUDGET_LOCKED_STATUSES as readonly string[]).includes(status)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = async (budget: Budget) => {
    if (isBudgetLocked(budget.status)) {
      toast.error('Orçamentos convertidos em pedido não podem ser editados')
      return
    }
    setEditing(budget)
    setDialogOpen(true)
    setFormLoading(true)
    try {
      const [{ data: full, error: budgetError }, { data: environments, error: envError }, { data: items, error: itemsError }] = await Promise.all([
        supabase.from('budgets').select('*').eq('id', budget.id).single(),
        supabase.from('budget_environments').select('*').eq('budget_id', budget.id).order('sort_order'),
        supabase.from('budget_items').select('*').eq('budget_id', budget.id).order('created_at'),
      ])
      if (budgetError) throw budgetError
      if (envError) throw envError
      if (itemsError) throw itemsError

      const row = full as {
        client_id: string
        project_name: string
        measurements: string | null
        discount: number
        notes: string | null
        environment: string | null
        commercial_terms: string | null
        entrada_percent: number | null
        manufacturing_timeline: string | null
        installation_timeline: string | null
      }

      const envRows = environments ?? []
      const itemRows = items ?? []

      let environmentForms: BudgetEnvironmentForm[]

      if (envRows.length > 0) {
        environmentForms = envRows.map((env) => {
          const envItems = itemRows.filter((item) => item.environment_id === env.id)
          const imageUrl = (env as { image_url?: string | null }).image_url?.trim() || null
          return {
            id: env.id,
            name: env.name,
            description: (env as { description?: string | null }).description ?? '',
            image_url: imageUrl,
            imageFile: null,
            imagePreview: imageUrl,
            items: envItems.map((item) => ({
              description: item.description,
              specifications: item.material ?? '',
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
            })),
          }
        })
      } else {
        environmentForms = [{
          name: row.environment?.trim() || 'Geral',
          description: '',
          image_url: null,
          imageFile: null,
          imagePreview: null,
          items: itemRows.map((item) => ({
            description: item.description,
            specifications: item.material ?? '',
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
          })),
        }]
      }

      environmentForms = environmentForms.map((env) => ({
        ...env,
        items: env.items.length > 0 ? env.items : [emptyItem()],
      }))

      setForm({
        client_id: row.client_id,
        project_name: row.project_name,
        measurements: row.measurements ?? '',
        discount: row.discount ?? 0,
        notes: row.notes ?? '',
        commercial_terms: row.commercial_terms?.trim() || DEFAULT_COMMERCIAL_TERMS,
        entrada_percent: Number(row.entrada_percent ?? DEFAULT_ENTRADA_PERCENT),
        manufacturing_timeline: row.manufacturing_timeline?.trim() || DEFAULT_MANUFACTURING_TIMELINE,
        installation_timeline: row.installation_timeline?.trim() || DEFAULT_INSTALLATION_TIMELINE,
        environments: environmentForms.length > 0 ? environmentForms : [emptyEnvironment()],
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar orçamento')
      setDialogOpen(false)
      setEditing(null)
    } finally {
      setFormLoading(false)
    }
  }

  const saveBudgetEnvironments = async (budgetId: string) => {
    const { error: deleteItemsError } = await supabase.from('budget_items').delete().eq('budget_id', budgetId)
    if (deleteItemsError) throw deleteItemsError

    const { error: deleteEnvError } = await supabase.from('budget_environments').delete().eq('budget_id', budgetId)
    if (deleteEnvError) throw deleteEnvError

    const validEnvironments = form.environments
      .map((env, index) => ({ ...env, sort_order: index }))
      .filter((env) => env.name.trim())

    for (const env of validEnvironments) {
      let imageUrl = env.image_url
      if (env.imageFile) {
        imageUrl = await uploadBudgetEnvironmentImage(env.imageFile, budgetId)
      }

      const { data: createdEnv, error: envInsertError } = await supabase
        .from('budget_environments')
        .insert({
          budget_id: budgetId,
          name: env.name.trim(),
          sort_order: env.sort_order,
          subtotal: environmentSellingTotal(env),
          description: env.description.trim() || null,
          image_url: imageUrl,
        })
        .select('id')
        .single()

      if (envInsertError) throw envInsertError

      const validItems = env.items.filter((item) => item.description.trim())
      if (validItems.length === 0) continue

      const { error: itemsInsertError } = await supabase.from('budget_items').insert(
        validItems.map((item) => ({
          budget_id: budgetId,
          environment_id: createdEnv.id,
          description: item.description.trim(),
          material: item.specifications.trim() || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        })),
      )
      if (itemsInsertError) throw itemsInsertError
    }
  }

  const handleEnvironmentImageChange = (envIndex: number, file: File | null) => {
    if (file) {
      try {
        validateBudgetEnvironmentImage(file)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Imagem inválida')
        return
      }
    }

    const environments = [...form.environments]
    const current = environments[envIndex]
    if (current.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(current.imagePreview)

    environments[envIndex] = {
      ...current,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : current.image_url,
      image_url: file ? current.image_url : current.image_url,
    }
    setForm({ ...form, environments })
  }

  const clearEnvironmentImage = (envIndex: number) => {
    const environments = [...form.environments]
    const current = environments[envIndex]
    if (current.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(current.imagePreview)
    environments[envIndex] = {
      ...current,
      imageFile: null,
      image_url: null,
      imagePreview: null,
    }
    setForm({ ...form, environments })
  }

  const onSubmit = async () => {
    if (!form.client_id || !form.project_name.trim()) {
      toast.error('Cliente e projeto são obrigatórios')
      return
    }
    if (!form.environments.some((env) => env.name.trim())) {
      toast.error('Adicione pelo menos um ambiente com nome')
      return
    }
    if (flattenValidItems(form.environments).length === 0) {
      toast.error('Adicione pelo menos um item com descrição')
      return
    }
    setSubmitting(true)
    try {
      const materials_cost = projectSellingTotal(form.environments)
      const primaryEnvironment = form.environments.find((env) => env.name.trim())?.name.trim() ?? null
      const payload = {
        client_id: form.client_id,
        project_name: form.project_name.trim(),
        environment: primaryEnvironment,
        measurements: form.measurements.trim() || null,
        labor_cost: 0,
        materials_cost,
        discount: form.discount,
        total_value: calculateTotal(),
        notes: form.notes.trim() || null,
        commercial_terms: form.commercial_terms.trim() || null,
        entrada_percent: Math.min(100, Math.max(0, form.entrada_percent)),
        manufacturing_timeline: form.manufacturing_timeline.trim() || null,
        installation_timeline: form.installation_timeline.trim() || null,
        proposal_template: 'premium',
      }

      if (editing) {
        await updateRecord('budgets', editing.id, payload)
        await saveBudgetEnvironments(editing.id)
        toast.success('Orçamento atualizado!')
      } else {
        const budget = await createRecord('budgets', {
          ...payload,
          lead_id: searchParams.get('lead') || null,
          status: 'em_analise',
        })
        await saveBudgetEnvironments((budget as { id: string }).id)
        toast.success('Orçamento criado!')
      }
      setDialogOpen(false)
      setEditing(null)
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  const removeEnvironment = (envIndex: number) => {
    if (form.environments.length <= 1) return
    setForm({ ...form, environments: form.environments.filter((_, i) => i !== envIndex) })
  }

  const removeItem = (envIndex: number, itemIndex: number) => {
    const environments = [...form.environments]
    if (environments[envIndex].items.length <= 1) return
    environments[envIndex] = {
      ...environments[envIndex],
      items: environments[envIndex].items.filter((_, i) => i !== itemIndex),
    }
    setForm({ ...form, environments })
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateRecord('budgets', id, {
        status,
        ...(status === 'convertido_pedido' ? { approved_at: new Date().toISOString() } : {}),
      })
      if (status === 'convertido_pedido') {
        const budget = budgets.find((b) => b.id === id)
        if (budget) {
          const { data: existing } = await supabase.from('orders').select('id').eq('budget_id', id).is('deleted_at', null).maybeSingle()
          if (!existing) {
            await createRecord('orders', {
              client_id: budget.client_id,
              budget_id: id,
              value: budget.total_value,
              status: 'projeto_desenvolvimento',
            })
            toast.success('Pedido criado!')
          } else {
            toast.info('Pedido já existe para este orçamento')
          }
        }
      }
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status')
    }
  }

  const handleDelete = async (budget: Budget) => {
    if (!await confirm({
      title: 'Excluir orçamento',
      message: `Deseja excluir o orçamento #${budget.number}? Esta ação não pode ser desfeita.`,
    })) return
    try {
      await softDelete('budgets', budget.id)
      toast.success('Orçamento excluído')
      refreshBudgets()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const openPdfDialog = (budget: Budget) => {
    setPdfBudget(budget)
    setPdfDialogOpen(true)
  }

  const runExportPdf = async () => {
    if (!pdfBudget) return
    setPdfExporting(true)
    try {
      await downloadBudgetProposalPdf(pdfBudget.id, pdfBudget.number, pdfBudget.project_name)
      toast.success('PDF gerado com sucesso!')
      setPdfDialogOpen(false)
      setPdfBudget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <PageContent>
      <PageHeader title="Orçamentos" description="Gestão de propostas comerciais"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditing(null)
              setFormLoading(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo Orçamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? `Editar Orçamento #${editing.number}` : 'Novo Orçamento'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Atualize os dados da proposta comercial' : 'Preencha os dados para criar uma nova proposta'}
                </DialogDescription>
              </DialogHeader>
              {formLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando orçamento...
                </div>
              ) : (
              <div className="space-y-4">
                <div>
                  <Label>Cliente</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Projeto</Label>
                    <Input
                      placeholder="Ex: Apartamento Laminê"
                      value={form.project_name}
                      onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Medidas gerais</Label>
                    <Input
                      placeholder="Ex: L 3,20m × A 2,70m"
                      value={form.measurements}
                      onChange={(e) => setForm({ ...form, measurements: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base">
                      <Layers className="h-4 w-4 text-gold" />
                      Ambientes
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({
                        ...form,
                        environments: [...form.environments, emptyEnvironment(`Ambiente ${form.environments.length + 1}`)],
                      })}
                    >
                      + Ambiente
                    </Button>
                  </div>

                  {form.environments.map((env, envIndex) => (
                    <div key={envIndex} className="rounded-xl border border-border/60 bg-surface-elevated/40 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Input
                          placeholder="Ex: Sala, Cozinha, Quarto..."
                          value={env.name}
                          onChange={(e) => {
                            const environments = [...form.environments]
                            environments[envIndex] = { ...environments[envIndex], name: e.target.value }
                            setForm({ ...form, environments })
                          }}
                          className="font-medium"
                        />
                        {form.environments.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeEnvironment(envIndex)} title="Remover ambiente">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        )}
                      </div>

                      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[112px_1fr]">
                        <div className="space-y-2">
                          <Label>Foto (PDF)</Label>
                          <label className="flex h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-elevated/60 text-xs text-gray-500 hover:border-gold/40">
                            {env.imagePreview ? (
                              <img src={env.imagePreview} alt={env.name || 'Ambiente'} className="h-full w-full object-cover" />
                            ) : (
                              <>
                                <ImagePlus className="mb-1 h-5 w-5 text-gold" />
                                Adicionar
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => handleEnvironmentImageChange(envIndex, e.target.files?.[0] ?? null)}
                            />
                          </label>
                          {env.imagePreview && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => clearEnvironmentImage(envIndex)}>
                              Remover foto
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Descrição comercial do ambiente</Label>
                          <Textarea
                            placeholder="Texto opcional exibido no PDF (ex.: composição e estilo do ambiente)"
                            value={env.description}
                            onChange={(e) => {
                              const environments = [...form.environments]
                              environments[envIndex] = { ...environments[envIndex], description: e.target.value }
                              setForm({ ...form, environments })
                            }}
                            rows={4}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {env.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2">
                            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1.4fr_0.6fr_0.9fr]">
                              <Input
                                placeholder="Móvel (ex: Torre)"
                                value={item.description}
                                onChange={(e) => {
                                  const environments = [...form.environments]
                                  const items = [...environments[envIndex].items]
                                  items[itemIndex] = { ...items[itemIndex], description: e.target.value }
                                  environments[envIndex] = { ...environments[envIndex], items }
                                  setForm({ ...form, environments })
                                }}
                              />
                              <Input
                                placeholder="Especificações (acabamento, medidas...)"
                                value={item.specifications}
                                onChange={(e) => {
                                  const environments = [...form.environments]
                                  const items = [...environments[envIndex].items]
                                  items[itemIndex] = { ...items[itemIndex], specifications: e.target.value }
                                  environments[envIndex] = { ...environments[envIndex], items }
                                  setForm({ ...form, environments })
                                }}
                              />
                              <Input
                                type="number"
                                min={0}
                                step="0.001"
                                placeholder="Qtd"
                                value={item.quantity}
                                onChange={(e) => {
                                  const environments = [...form.environments]
                                  const items = [...environments[envIndex].items]
                                  items[itemIndex] = { ...items[itemIndex], quantity: Number(e.target.value) }
                                  environments[envIndex] = { ...environments[envIndex], items }
                                  setForm({ ...form, environments })
                                }}
                              />
                              <CurrencyInput
                                placeholder="Valor"
                                value={item.unit_price}
                                onChange={(unit_price) => {
                                  const environments = [...form.environments]
                                  const items = [...environments[envIndex].items]
                                  items[itemIndex] = { ...items[itemIndex], unit_price }
                                  environments[envIndex] = { ...environments[envIndex], items }
                                  setForm({ ...form, environments })
                                }}
                              />
                            </div>
                            {env.items.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeItem(envIndex, itemIndex)} title="Remover item">
                                <X className="h-4 w-4 text-red-400" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const environments = [...form.environments]
                            environments[envIndex] = {
                              ...environments[envIndex],
                              items: [...environments[envIndex].items, emptyItem()],
                            }
                            setForm({ ...form, environments })
                          }}
                        >
                          + Móvel
                        </Button>
                      </div>

                      <div className="mt-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-sm">
                        <span className="text-gray-400">Valor do ambiente: </span>
                        <span className="font-semibold text-gold">{formatCurrency(environmentSellingTotal(env))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><Label>Desconto</Label><CurrencyInput value={form.discount} onChange={(discount) => setForm({ ...form, discount })} /></div>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-surface-elevated/30 p-4">
                  <Label className="text-base">Proposta comercial (PDF)</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Percentual de entrada (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={form.entrada_percent}
                        onChange={(e) => {
                          const parsed = Number(e.target.value)
                          setForm({
                            ...form,
                            entrada_percent: Number.isFinite(parsed)
                              ? Math.min(100, Math.max(0, parsed))
                              : DEFAULT_ENTRADA_PERCENT,
                          })
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Usado no card de entrada do PDF ({formatCurrency(calculateTotal() * (form.entrada_percent / 100))} de {formatCurrency(calculateTotal())})
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label>Condições comerciais</Label>
                    <Textarea
                      placeholder="Entrada, saldo, formas de pagamento..."
                      value={form.commercial_terms}
                      onChange={(e) => setForm({ ...form, commercial_terms: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Prazo de fabricação / produção</Label>
                      <Textarea
                        value={form.manufacturing_timeline}
                        onChange={(e) => setForm({ ...form, manufacturing_timeline: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Prazo de montagem</Label>
                      <Textarea
                        value={form.installation_timeline}
                        onChange={(e) => setForm({ ...form, installation_timeline: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações adicionais exibidas no PDF"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm">
                  <p className="text-gray-400">Total da proposta: <span className="font-bold text-gold">{formatCurrency(calculateTotal())}</span></p>
                </div>
                <Button onClick={onSubmit} className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Salvar Alterações' : 'Salvar Orçamento'}
                </Button>
              </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <TableToolbar panel />

      <PageDataZone>
      <DataTable
        columns={[
          { key: 'number', header: '#', render: (r) => `#${r.number}` },
          { key: 'client', header: 'Cliente', render: (r) => r.client?.name ?? '-' },
          { key: 'project_name', header: 'Projeto' },
          { key: 'total_value', header: 'Valor', render: (r) => formatCurrency(r.total_value) },
          { key: 'status', header: 'Status', render: (r) => <Badge>{getBudgetStatusLabel(r.status)}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-1">
              {!isBudgetLocked(r.status) && (
                <Button variant="ghost" size="icon" title="Editar" onClick={(e) => { e.stopPropagation(); void openEdit(r) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" title="Exportar PDF" onClick={(e) => { e.stopPropagation(); openPdfDialog(r) }}><FileDown className="h-4 w-4" /></Button>
              <Select
                value={r.status === 'aprovado' ? 'convertido_pedido' : r.status}
                onValueChange={(v) => updateStatus(r.id, v)}
              >
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{BUDGET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(r) }}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          )},
        ]}
        data={budgets}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      {isFetching && !loading && (
        <p className="mt-2 text-center text-[10px] text-gray-600">Atualizando...</p>
      )}
      </PageDataZone>
      <ConfirmDialog {...dialogProps} />
      <Dialog open={pdfDialogOpen} onOpenChange={(open) => {
        setPdfDialogOpen(open)
        if (!open) setPdfBudget(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar proposta comercial</DialogTitle>
            <DialogDescription>
              {pdfBudget
                ? `Orçamento #${pdfBudget.number} — ${pdfBudget.project_name}`
                : 'Gere o PDF premium da proposta comercial'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Documento profissional com capa, ambientes, valores de venda e condições comerciais.
              Custos internos e mão de obra não são exibidos.
            </p>
            <Button className="w-full" disabled={pdfExporting} onClick={() => void runExportPdf()}>
              {pdfExporting ? 'Gerando PDF...' : 'Gerar PDF Premium'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContent>
  )
}
