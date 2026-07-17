import { DEFAULT_ENTRADA_PERCENT } from '@/pdf/defaults'

export type BudgetEntradaMode = 'percent' | 'value'

export function parseBudgetEntradaMode(value: string | null | undefined): BudgetEntradaMode {
  return value === 'value' ? 'value' : 'percent'
}

export function clampEntradaPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ENTRADA_PERCENT
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100))
}

export function resolveBudgetEntradaAmount(
  totalValue: number,
  mode: BudgetEntradaMode,
  percent: number,
  fixedValue: number,
): number {
  const total = Math.max(0, Number(totalValue) || 0)
  if (mode === 'value') {
    return Math.max(0, Number(fixedValue) || 0)
  }
  return total * (clampEntradaPercent(percent) / 100)
}

export function formatEntradaPercentLabel(percent: number): string {
  const p = clampEntradaPercent(percent)
  return Number.isInteger(p)
    ? `${p}%`
    : `${p.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/** Aceita "30,5" ou "30.5" e retorna número ou null se incompleto/inválido. */
export function parseEntradaPercentInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '.') return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return clampEntradaPercent(parsed)
}
