import { useLocation } from 'react-router-dom'
import { getBreadcrumbLabel } from '@/lib/navigation'

export function useBreadcrumb() {
  const { pathname } = useLocation()
  const labels = getBreadcrumbLabel(pathname)
  return { pathname, labels, current: labels[labels.length - 1] ?? '' }
}
