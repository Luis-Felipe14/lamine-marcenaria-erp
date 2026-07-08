import type { BudgetProposalData } from '@/pdf/types'
import { formatDate } from '@/lib/utils'

interface ProposalMetaBarProps {
  data: BudgetProposalData
}

export function ProposalMetaBar({ data }: ProposalMetaBarProps) {
  const { budget, client } = data

  const items = [
    { label: 'Cliente', value: client.name },
    { label: 'Projeto', value: budget.projectName },
    { label: 'Data', value: formatDate(budget.date) },
    { label: 'Validade', value: `${budget.validityDays} dias` },
    { label: 'Responsável comercial', value: budget.responsibleName ?? data.company.name },
  ]

  return (
    <div className="proposal-meta-bar">
      {items.map((item) => (
        <div key={item.label} className="proposal-meta-bar__item">
          <span className="proposal-meta-bar__label">{item.label}</span>
          <span className="proposal-meta-bar__value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
