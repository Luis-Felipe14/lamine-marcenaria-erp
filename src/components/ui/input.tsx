import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] placeholder:text-gray-500 transition-all duration-200',
        'focus-visible:outline-none focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'light:border-black/15 light:bg-white light:text-gray-900 light:shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] light:placeholder:text-gray-600',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
