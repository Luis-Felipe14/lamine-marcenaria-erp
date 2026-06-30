import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-gold/15 text-gold border border-gold/20',
        success: 'bg-green-500/12 text-green-400 border border-green-500/20 light:bg-green-50 light:text-green-700 light:border-green-200',
        warning: 'bg-yellow-500/12 text-yellow-400 border border-yellow-500/20 light:bg-amber-50 light:text-amber-800 light:border-amber-200',
        danger: 'bg-red-500/12 text-red-400 border border-red-500/20 light:bg-red-50 light:text-red-700 light:border-red-200',
        info: 'bg-blue-500/12 text-blue-400 border border-blue-500/20 light:bg-blue-50 light:text-blue-700 light:border-blue-200',
        secondary: 'bg-gray-500/12 text-gray-400 border border-gray-500/20 light:bg-gray-100 light:text-gray-700 light:border-gray-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
