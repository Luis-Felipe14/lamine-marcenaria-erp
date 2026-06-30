export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Converte string digitada (máscara BRL) para número decimal */
export function parseCurrencyInput(input: string): number {
  const digits = onlyDigits(input)
  if (!digits) return 0
  return parseInt(digits, 10) / 100
}

/** Formata número para exibição em campo de entrada (R$ 1.234,56) */
export function formatCurrencyInput(value: number, emptyWhenZero = true): string {
  if (emptyWhenZero && !value) return ''
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export type MaskType = 'phone' | 'cpfCnpj' | 'currency'

export function applyMask(value: string, mask: MaskType): string {
  if (mask === 'phone') return maskPhone(value)
  if (mask === 'currency') return formatCurrencyInput(parseCurrencyInput(value), false)
  return maskCpfCnpj(value)
}
