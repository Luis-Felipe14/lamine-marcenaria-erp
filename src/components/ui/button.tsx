import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#a8841f] via-gold to-[#b8921f] text-black shadow-[0_2px_8px_rgba(0,0,0,0.28),0_6px_20px_rgba(201,162,39,0.18)] hover:-translate-y-0.5 hover:from-[#b8921f] hover:via-gold-light hover:to-[#c9a53d] hover:shadow-[0_6px_24px_rgba(201,162,39,0.22)] active:scale-[0.985] transition-all duration-200',
        destructive: 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
        outline:
          'border border-border bg-transparent hover:border-gold/30 hover:bg-surface-elevated hover:text-white light:hover:text-gray-900',
        secondary: 'bg-surface-elevated text-white hover:bg-surface-card border border-border/60 light:text-gray-900',
        ghost: 'hover:bg-surface-elevated hover:text-white light:hover:bg-gray-100 light:hover:text-gray-900',
        link: 'text-gold underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-xl px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
