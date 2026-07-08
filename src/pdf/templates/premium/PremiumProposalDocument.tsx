import type { BudgetProposalData } from '@/pdf/types'
import { ProposalHeader } from '@/pdf/templates/premium/ProposalHeader'
import { ProposalMetaBar } from '@/pdf/templates/premium/ProposalMetaBar'
import { EnvironmentBlock } from '@/pdf/templates/premium/EnvironmentBlock'
import { ProposalSidebar } from '@/pdf/templates/premium/ProposalSidebar'
import { ProposalBottomSection } from '@/pdf/templates/premium/ProposalBottomSection'
import { ProposalFooter } from '@/pdf/templates/premium/ProposalFooter'

interface PremiumProposalDocumentProps {
  data: BudgetProposalData
}

export function PremiumProposalDocument({ data }: PremiumProposalDocumentProps) {
  return (
    <div className="proposal-root">
      <div className="proposal-document">
        <ProposalHeader data={data} />
        <ProposalMetaBar data={data} />

        <div className="proposal-body">
          <div className="proposal-main">
            {data.environments.map((environment, index) => (
              <EnvironmentBlock key={`${environment.name}-${index}`} environment={environment} />
            ))}
            <ProposalBottomSection data={data} />
          </div>
          <ProposalSidebar data={data} />
        </div>

        <ProposalFooter data={data} />
      </div>
    </div>
  )
}
