import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl light:text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="relative z-10 flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  )
}
