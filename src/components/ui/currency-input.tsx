import * as React from 'react'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/masks'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
  emptyWhenZero?: boolean
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, emptyWhenZero = true, className, placeholder = 'R$ 0,00', ...props }, ref) => (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatCurrencyInput(value, emptyWhenZero)}
      placeholder={placeholder}
      onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200',
        'focus-visible:outline-none focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20',
        'disabled:cursor-not-allowed disabled:opacity-50 light:border-black/15 light:bg-white light:text-gray-900 light:shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] light:placeholder:text-gray-600',
        'tabular-nums',
        className
      )}
      {...props}
    />
  )
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
