import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('pt-BR').format(new Date(y, m - 1, d))
  }
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`
  return formatDate(d)
}

export function formatInstallment(current: number | null | undefined, total: number | null | undefined): string {
  if (!current || !total || total < 1) return '—'
  return `${current}/${total}`
}

/** Ex.: "15 de junho" — para datas ISO yyyy-mm-dd */
export function formatBirthdayDay(date: string | null | undefined): string {
  if (!date) return '—'
  const [, month, day] = date.split('-').map(Number)
  if (!month || !day) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(2000, month - 1, day))
}

export function formatCpfDisplay(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function getLeadPriority(value: number): { label: string; variant: 'danger' | 'warning' | 'secondary' } {
  if (value >= 50000) return { label: 'Alta', variant: 'danger' }
  if (value >= 15000) return { label: 'Média', variant: 'warning' }
  return { label: 'Baixa', variant: 'secondary' }
}
