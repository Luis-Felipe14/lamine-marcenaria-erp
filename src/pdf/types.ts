export type BudgetProposalTemplateId = 'premium' | 'classic' | 'executive'

export interface BudgetProposalCompany {
  name: string
  document?: string
  phone?: string
  email?: string
  address?: string
  logoUrl: string
  headerImageUrl?: string
}

export interface BudgetProposalClient {
  name: string
  document?: string
  phone?: string
  email?: string
  address?: string
}

export interface BudgetProposalEnvironmentItem {
  description: string
  specifications?: string
  value: number
}

export interface BudgetProposalEnvironment {
  name: string
  description?: string
  imageUrl?: string
  value: number
  items: BudgetProposalEnvironmentItem[]
}

export interface BudgetProposalData {
  templateId: BudgetProposalTemplateId
  company: BudgetProposalCompany
  budget: {
    number: number
    date: string
    validityDate: string
    validityDays: number
    projectName: string
    measurements?: string
    discount: number
    totalValue: number
    observations?: string
    commercialTerms?: string
    entradaPercent: number
    manufacturingTimeline?: string
    installationTimeline?: string
    responsibleName?: string
    includedItems: string[]
  }
  client: BudgetProposalClient
  environments: BudgetProposalEnvironment[]
}
