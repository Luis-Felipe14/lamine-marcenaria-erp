import * as React from 'react'
import { applyMask, type MaskType } from '@/lib/masks'
import { cn } from '@/lib/utils'

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType
  onChange?: (value: string) => void
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, value, className, ...props }, ref) => (
    <input
      ref={ref}
      value={value ?? ''}
      onChange={(e) => onChange?.(applyMask(e.target.value, mask))}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200',
        'focus-visible:outline-none focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20',
        'disabled:cursor-not-allowed disabled:opacity-50 light:border-black/15 light:bg-white light:text-gray-900 light:shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] light:placeholder:text-gray-600',
        className
      )}
      {...props}
    />
  )
)
MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }
