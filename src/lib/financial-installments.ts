/** Gera cronograma de parcelas iguais (último parcela absorve centavos). */
export function buildEqualInstallmentSchedule(
  totalAmount: number,
  installmentCount: number,
  firstDueDate: string,
): Array<{ installment_number: number; amount: number; due_date: string }> {
  const count = Math.floor(Number(installmentCount))
  const total = Math.round(Number(totalAmount) * 100) / 100
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Informe o valor total da compra')
  }
  if (!Number.isFinite(count) || count < 2) {
    throw new Error('Informe ao menos 2 parcelas')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
    throw new Error('Informe a data do primeiro vencimento')
  }

  const totalCents = Math.round(total * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count

  const [y0, m0, d0] = firstDueDate.split('-').map(Number)
  const dayOfMonth = d0

  const rows: Array<{ installment_number: number; amount: number; due_date: string }> = []
  for (let i = 0; i < count; i++) {
    const cents = baseCents + (i === count - 1 ? remainder : 0)
    const due = addMonthsKeepingDay(y0, m0 - 1, dayOfMonth, i)
    rows.push({
      installment_number: i + 1,
      amount: cents / 100,
      due_date: formatYmd(due),
    })
  }
  return rows
}

function addMonthsKeepingDay(year: number, monthIndex: number, day: number, addMonths: number): Date {
  const targetMonth = monthIndex + addMonths
  const y = year + Math.floor(targetMonth / 12)
  const m = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(day, lastDay))
}

function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
