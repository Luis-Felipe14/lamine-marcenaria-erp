import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-elevated/80 light:bg-gray-200', className)}
      {...props}
    />
  )
}

export { Skeleton }
