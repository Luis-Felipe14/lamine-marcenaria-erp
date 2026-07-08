import { formatDate } from '@/lib/utils'

export const DEFAULT_ENTRADA_PERCENT = 30

export const DEFAULT_COMMERCIAL_TERMS = `Saldo em até 10 parcelas sem juros no cartão ou boleto, mediante contrato.
Validade conforme data indicada nesta proposta.`

export const DEFAULT_MANUFACTURING_TIMELINE = `35 dias úteis após aprovação do projeto executivo e confirmação da entrada.`

export const DEFAULT_INSTALLATION_TIMELINE = `Até 3 dias úteis após a entrega dos móveis, mediante agendamento com o cliente.`

export const DEFAULT_INCLUDED_ITEMS = [
  'Projeto e especificação técnica',
  'Fabricação dos móveis planejados',
  'Acabamentos conforme especificado',
  'Entrega dos móveis no local',
  'Montagem profissional',
]

export const PROPOSAL_HEADER_TAGLINE =
  'Apresentamos abaixo a proposta para execução de móveis planejados sob medida, com soluções completas e personalizadas para o seu projeto.'

export const PROPOSAL_FOOTER_TAGLINE =
  'Estamos à disposição para esclarecer dúvidas e dar continuidade ao seu projeto.'

export const PROPOSAL_VALIDITY_DAYS = 30

export function computeValidityDate(issueDate: string): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(issueDate)
    ? (() => {
        const [y, m, d] = issueDate.split('-').map(Number)
        return new Date(y, m - 1, d)
      })()
    : new Date(issueDate)

  base.setDate(base.getDate() + PROPOSAL_VALIDITY_DAYS)
  return formatDate(base)
}

export function formatClientAddress(client: {
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}): string | undefined {
  const street = [client.address_street, client.address_number].filter(Boolean).join(', ')
  const line2 = [client.address_complement, client.address_neighborhood].filter(Boolean).join(' — ')
  const city = [client.address_city, client.address_state].filter(Boolean).join(' / ')
  const zip = client.address_zip ? `CEP ${client.address_zip}` : ''
  const parts = [street, line2, city, zip].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : undefined
}
