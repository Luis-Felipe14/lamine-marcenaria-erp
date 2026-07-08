import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { KanbanBoard } from '@/components/shared/KanbanBoard'
import { LeadKanbanCard, type EnrichedLead } from '@/components/crm/LeadKanbanCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { FormField } from '@/components/ui/form-field'
import { MaskedInput } from '@/components/ui/masked-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { LEAD_STATUSES, SELECT_NONE } from '@/lib/constants'
import { queryKeys } from '@/lib/query-keys'
import { invalidateDashboardMetrics } from '@/lib/invalidate-dashboard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createRecord, updateRecord, softDelete } from '@/services/api'
import { useConfirm } from '@/hooks/useConfirm'
import { useCrmLeads, useLookupArchitects } from '@/hooks/useQueries'

function toSelectValue(value?: string | null) {
  return value && value.length > 0 ? value : SELECT_NONE
}

function fromSelectValue(value: string) {
  return value === SELECT_NONE ? '' : value
}

const leadSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  origin: z.string().optional(),
  architect_id: z.string().optional(),
  estimated_value: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

export function CrmPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm, dialogProps } = useConfirm()
  const { data: leads = [], isLoading: loading } = useCrmLeads()
  const { data: architects = [] } = useLookupArchitects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null)
  const [history, setHistory] = useState<{ id: string; description: string; contact_date: string; contact_type: string }[]>([])

  const form = useForm<z.infer<typeof leadSchema>>({ resolver: zodResolver(leadSchema) })

  const refreshLeads = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.crmLeads }),
      invalidateDashboardMetrics(queryClient),
    ])
  }, [queryClient])

  const columns = useMemo(
    () =>
      LEAD_STATUSES.map((status) => ({
        id: status.value,
        title: status.label,
        color: status.color,
        items: leads.filter((l) => l.status === status.value),
      })),
    [leads]
  )

  const renderCard = useCallback((lead: EnrichedLead) => <LeadKanbanCard lead={lead} />, [])

  const onSubmit = async (data: z.infer<typeof leadSchema>) => {
    try {
      await createRecord('leads', {
        ...data,
        architect_id: data.architect_id || null,
        status: 'novo_lead',
        estimated_value: data.estimated_value ?? 0,
      })
      toast.success('Lead criado!')
      setDialogOpen(false)
      form.reset()
      await refreshLeads()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar lead')
    }
  }

  const updateStatus = useCallback(async (leadId: string, newStatus: string, oldStatus?: string) => {
    const previous = oldStatus ?? leads.find((l) => l.id === leadId)?.status
    if (!previous || newStatus === previous) return

    queryClient.setQueryData<EnrichedLead[]>(queryKeys.crmLeads, (prev) =>
      (prev ?? []).map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    )
    if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus })

    try {
      await updateRecord('leads', leadId, { status: newStatus })
      toast.success('Status atualizado')
      await invalidateDashboardMetrics(queryClient)
    } catch (e) {
      queryClient.setQueryData<EnrichedLead[]>(queryKeys.crmLeads, (prev) =>
        (prev ?? []).map((l) => (l.id === leadId ? { ...l, status: previous } : l))
      )
      if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: previous })
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar')
    }
  }, [leads, queryClient, selectedLead])

  const openLead = useCallback(async (lead: EnrichedLead) => {
    setSelectedLead(lead)
    const { data } = await supabase
      .from('lead_contact_history')
      .select('*')
      .eq('lead_id', lead.id)
      .order('contact_date', { ascending: false })
    setHistory(data ?? [])
  }, [])

  const convertToClient = async (lead: EnrichedLead) => {
    try {
      const client = await createRecord('clients', {
        name: lead.name,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        architect_id: lead.architect_id ?? null,
      })
      await updateRecord('leads', lead.id, {
        client_id: (client as unknown as { id: string }).id,
        status: 'fechado',
        converted_at: new Date().toISOString(),
      })
      toast.success('Lead convertido em cliente!')
      setSelectedLead(null)
      await refreshLeads()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na conversão')
    }
  }

  const addContact = async (leadId: string, description: string) => {
    try {
      const { error } = await supabase.from('lead_contact_history').insert({
        lead_id: leadId,
        contact_type: 'nota',
        description,
      })
      if (error) throw error
      if (selectedLead) await openLead({ ...selectedLead, id: leadId })
      await refreshLeads()
      toast.success('Contato registrado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar contato')
    }
  }

  const updateArchitect = async (leadId: string, architectId: string) => {
    const value = architectId || null
    try {
      await updateRecord('leads', leadId, { architect_id: value })
      if (selectedLead?.id === leadId) {
        const architect = architects.find((item) => item.id === value)
        setSelectedLead({
          ...selectedLead,
          architect_id: value,
          architect: architect ? { name: architect.name } : null,
        })
      }
      await refreshLeads()
      toast.success('Arquiteto atualizado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar arquiteto')
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="CRM Comercial"
        description="Funil visual com oportunidades, prioridades e histórico de interações"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Novo Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Lead</DialogTitle>
                <DialogDescription>Cadastre uma nova oportunidade comercial</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Nome" required error={form.formState.errors.name?.message}>
                  <Input {...form.register('name')} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Telefone">
                    <MaskedInput mask="phone" value={form.watch('phone') ?? ''} onChange={(v) => form.setValue('phone', v)} />
                  </FormField>
                  <FormField label="WhatsApp">
                    <MaskedInput mask="phone" value={form.watch('whatsapp') ?? ''} onChange={(v) => form.setValue('whatsapp', v)} />
                  </FormField>
                </div>
                <FormField label="E-mail">
                  <Input type="email" {...form.register('email')} />
                </FormField>
                <FormField label="Origem" hint="Ex: Instagram, Indicação">
                  <Input {...form.register('origin')} />
                </FormField>
                <div className="space-y-1.5">
                  <Label>Arquiteto parceiro</Label>
                  <Select
                    value={toSelectValue(form.watch('architect_id'))}
                    onValueChange={(v) => form.setValue('architect_id', fromSelectValue(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                      {architects.map((architect) => (
                        <SelectItem key={architect.id} value={architect.id}>{architect.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormField label="Valor estimado">
                  <CurrencyInput
                    value={form.watch('estimated_value') ?? 0}
                    onChange={(v) => form.setValue('estimated_value', v)}
                  />
                </FormField>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500">Observações / Ambiente</label>
                  <Textarea {...form.register('notes')} placeholder="Ex: Cozinha planejada, 12m²..." />
                </div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          onCardClick={openLead}
          onStatusChange={updateStatus}
          renderCard={renderCard}
        />
      )}

      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedLead.name}</DialogTitle>
              <DialogDescription>Detalhes e histórico do lead</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedLead.estimated_value > 0 && (
                <p className="text-lg font-semibold text-gold">{formatCurrency(selectedLead.estimated_value)}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {selectedLead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedLead.phone}</span>}
                {selectedLead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedLead.email}</span>}
                {selectedLead.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{selectedLead.whatsapp}</span>}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={selectedLead.status} onValueChange={(v) => updateStatus(selectedLead.id, v, selectedLead.status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Arquiteto parceiro</Label>
                <Select
                  value={toSelectValue(selectedLead.architect_id)}
                  onValueChange={(v) => void updateArchitect(selectedLead.id, fromSelectValue(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Nenhum</SelectItem>
                    {architects.map((architect) => (
                      <SelectItem key={architect.id} value={architect.id}>{architect.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => convertToClient(selectedLead)}>Converter em Cliente</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/orcamentos?lead=${selectedLead.id}`)}>
                  Criar Orçamento
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedLead) return
                    if (!await confirm({
                      title: 'Excluir lead',
                      message: `Deseja excluir o lead "${selectedLead.name}"? Esta ação não pode ser desfeita.`,
                    })) return
                    try {
                      await softDelete('leads', selectedLead.id)
                      toast.success('Lead excluído')
                      setSelectedLead(null)
                      await refreshLeads()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Histórico de Contatos</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border bg-surface-elevated p-2 text-sm">
                      <Badge variant="secondary" className="mb-1">{h.contact_type}</Badge>
                      <p>{h.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(h.contact_date)}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const desc = (e.target as HTMLFormElement).description.value
                  if (desc) addContact(selectedLead.id, desc)
                }} className="mt-2 flex gap-2">
                  <Input name="description" placeholder="Registrar contato..." />
                  <Button type="submit" size="sm">Add</Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
