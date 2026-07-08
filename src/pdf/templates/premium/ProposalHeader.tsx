import type { BudgetProposalData } from '@/pdf/types'
import { PROPOSAL_HEADER_TAGLINE } from '@/pdf/defaults'

interface ProposalHeaderProps {
  data: BudgetProposalData
}

export function ProposalHeader({ data }: ProposalHeaderProps) {
  const { company } = data
  const bgStyle = company.headerImageUrl
    ? { backgroundImage: `linear-gradient(90deg, rgba(18,16,14,0.92) 0%, rgba(18,16,14,0.55) 45%, rgba(18,16,14,0.35) 100%), url('${company.headerImageUrl}')` }
    : { backgroundImage: 'linear-gradient(135deg, #1a1714 0%, #2a231d 50%, #1a1714 100%)' }

  return (
    <header className="proposal-hero" style={bgStyle}>
      <div className="proposal-hero__inner">
        <div className="proposal-hero__brand">
          <img src={company.logoUrl} alt={company.name} className="proposal-hero__logo" />
        </div>
        <div className="proposal-hero__title-wrap">
          <div className="proposal-hero__divider" />
          <div>
            <h1 className="proposal-hero__title">Orçamento de Móveis Planejados</h1>
            <p className="proposal-hero__tagline">{PROPOSAL_HEADER_TAGLINE}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
