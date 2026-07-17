import type { BudgetProposalData } from '@/pdf/types'
import { formatCurrency } from '@/lib/utils'
import {
  formatEntradaPercentLabel,
  parseBudgetEntradaMode,
  resolveBudgetEntradaAmount,
} from '@/lib/budget-entrada'

interface ProposalSidebarProps {
  data: BudgetProposalData
}

export function ProposalSidebar({ data }: ProposalSidebarProps) {
  const { budget, environments } = data
  const entradaMode = parseBudgetEntradaMode(budget.entradaMode)
  const entrada = resolveBudgetEntradaAmount(
    budget.totalValue,
    entradaMode,
    budget.entradaPercent,
    budget.entradaValue,
  )
  const saldo = Math.max(0, budget.totalValue - entrada)
  const entradaLabel = entradaMode === 'value'
    ? 'valor'
    : formatEntradaPercentLabel(budget.entradaPercent)

  return (
    <aside className="proposal-sidebar">
      <section className="proposal-panel">
        <h2 className="proposal-panel__title">Resumo do projeto</h2>
        <ul className="proposal-summary-list">
          {environments.map((env, index) => (
            <li key={`${env.name}-${index}`}>
              <span>{env.name}</span>
              <span>{formatCurrency(env.value)}</span>
            </li>
          ))}
        </ul>
        {budget.discount > 0 ? (
          <div className="proposal-summary-discount">
            <span>Desconto</span>
            <span>− {formatCurrency(budget.discount)}</span>
          </div>
        ) : null}
        <div className="proposal-summary-total">
          <span>Total do projeto</span>
          <strong>{formatCurrency(budget.totalValue)}</strong>
        </div>
      </section>

      <section className="proposal-panel">
        <h2 className="proposal-panel__title">Condições comerciais</h2>
        <div className="proposal-commercial-grid">
          <div>
            <span className="proposal-commercial-label">Entrada ({entradaLabel})</span>
            <strong>{formatCurrency(entrada)}</strong>
          </div>
          <div>
            <span className="proposal-commercial-label">Saldo</span>
            <strong>{formatCurrency(saldo)}</strong>
          </div>
        </div>
        <p className="proposal-panel__text">{budget.commercialTerms}</p>
      </section>

      <section className="proposal-panel">
        <h2 className="proposal-panel__title">O orçamento inclui</h2>
        <ul className="proposal-checklist proposal-checklist--light">
          {budget.includedItems.map((item) => (
            <li key={item}>
              <span className="proposal-checklist__mark proposal-checklist__mark--gold" aria-hidden>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
