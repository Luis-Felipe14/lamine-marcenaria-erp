import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { loadBudgetProposalData } from '@/pdf/load-budget-proposal'
import { resolveProposalTemplate } from '@/pdf/registry'
import type { BudgetProposalData } from '@/pdf/types'
import '@/pdf/styles/premium-proposal.css'

export function BudgetPdfRenderPage() {
  const { budgetId } = useParams<{ budgetId: string }>()
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [Document, setDocument] = useState<ComponentType<{ data: BudgetProposalData }> | null>(null)
  const [data, setData] = useState<BudgetProposalData | null>(null)

  useEffect(() => {
    if (!budgetId) {
      setError('Orçamento não informado')
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const proposal = await loadBudgetProposalData(supabase, budgetId)
        if (cancelled) return
        const template = resolveProposalTemplate(proposal.templateId)
        setDocument(() => template.Component)
        setData(proposal)
        setReady(true)
        document.title = `Proposta ${proposal.budget.number} — ${proposal.budget.projectName}`
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar proposta')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [budgetId])

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (!ready || !Document || !data) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <p>Carregando proposta...</p>
      </div>
    )
  }

  return <Document data={data} />
}
