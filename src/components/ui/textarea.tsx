import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50',
        'light:border-black/15 light:bg-white light:text-gray-900 light:placeholder:text-gray-600 light:shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
