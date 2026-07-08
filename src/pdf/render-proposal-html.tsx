import { renderToStaticMarkup } from 'react-dom/server'
import { resolveProposalTemplate } from '@/pdf/registry'
import type { BudgetProposalData } from '@/pdf/types'

export function renderProposalMarkup(data: BudgetProposalData): string {
  const template = resolveProposalTemplate(data.templateId)
  return renderToStaticMarkup(<template.Component data={data} />)
}

export function wrapProposalHtml(markup: string, css: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
  ${markup}
</body>
</html>`
}

export function renderProposalHtml(data: BudgetProposalData, css: string): string {
  const markup = renderProposalMarkup(data)
  const title = `Proposta ${data.budget.number} — ${data.budget.projectName}`
  return wrapProposalHtml(markup, css, title)
}
