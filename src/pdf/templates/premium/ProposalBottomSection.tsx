import type { BudgetProposalData } from '@/pdf/types'

interface ProposalBottomSectionProps {
  data: BudgetProposalData
}

export function ProposalBottomSection({ data }: ProposalBottomSectionProps) {
  const { budget } = data

  return (
    <section className="proposal-bottom">
      <div className="proposal-bottom__timelines">
        <div className="proposal-timeline-card">
          <span className="proposal-timeline-card__icon" aria-hidden>⚙</span>
          <div>
            <h3>Prazo de produção</h3>
            <p>{budget.manufacturingTimeline}</p>
          </div>
        </div>
        <div className="proposal-timeline-card">
          <span className="proposal-timeline-card__icon" aria-hidden>🔧</span>
          <div>
            <h3>Prazo de montagem</h3>
            <p>{budget.installationTimeline}</p>
          </div>
        </div>
      </div>

      {budget.observations || budget.measurements ? (
        <div className="proposal-observations">
          <h3>Observações</h3>
          {budget.observations ? <p>{budget.observations}</p> : null}
          {budget.measurements ? (
            <p>
              <strong>Medidas gerais:</strong> {budget.measurements}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
