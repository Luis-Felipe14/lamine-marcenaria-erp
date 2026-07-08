import type { ComponentType } from 'react'
import type { BudgetProposalData } from '@/pdf/types'
import { PremiumProposalDocument } from '@/pdf/templates/premium/PremiumProposalDocument'

export interface BudgetProposalTemplate {
  id: BudgetProposalData['templateId']
  label: string
  description: string
  Component: ComponentType<{ data: BudgetProposalData }>
}

export const BUDGET_PROPOSAL_TEMPLATES: Record<BudgetProposalData['templateId'], BudgetProposalTemplate> = {
  premium: {
    id: 'premium',
    label: 'Premium',
    description: 'Proposta luxuosa inspirada em marcas de alto padrão',
    Component: PremiumProposalDocument,
  },
  classic: {
    id: 'classic',
    label: 'Clássico',
    description: 'Em breve — layout tradicional e elegante',
    Component: PremiumProposalDocument,
  },
  executive: {
    id: 'executive',
    label: 'Executivo',
    description: 'Em breve — visual corporativo minimalista',
    Component: PremiumProposalDocument,
  },
}

export const BUDGET_PROPOSAL_TEMPLATE_LIST = Object.values(BUDGET_PROPOSAL_TEMPLATES)

export function resolveProposalTemplate(templateId: string): BudgetProposalTemplate {
  return BUDGET_PROPOSAL_TEMPLATES[templateId as BudgetProposalData['templateId']]
    ?? BUDGET_PROPOSAL_TEMPLATES.premium
}
