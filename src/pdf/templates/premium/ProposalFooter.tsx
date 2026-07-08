import type { BudgetProposalData } from '@/pdf/types'
import { PROPOSAL_FOOTER_TAGLINE } from '@/pdf/defaults'

interface ProposalFooterProps {
  data: BudgetProposalData
}

export function ProposalFooter({ data }: ProposalFooterProps) {
  const { company } = data

  return (
    <footer className="proposal-footer">
      <div className="proposal-footer__thanks">
        <p className="proposal-footer__script">Obrigado pela confiança!</p>
        <p className="proposal-footer__tagline">{PROPOSAL_FOOTER_TAGLINE}</p>
      </div>
      <div className="proposal-footer__divider" />
      <div className="proposal-footer__contacts">
        <img src={company.logoUrl} alt={company.name} className="proposal-footer__logo" />
        <div className="proposal-footer__lines">
          {company.phone ? <p>WhatsApp: {company.phone}</p> : null}
          {company.email ? <p>E-mail: {company.email}</p> : null}
          {company.address ? <p>{company.address}</p> : null}
        </div>
      </div>
    </footer>
  )
}
