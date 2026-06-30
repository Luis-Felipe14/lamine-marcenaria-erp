import { Outlet, useLocation } from 'react-router-dom'

export function PageTransition() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="animate-page-fade">
      <Outlet />
    </div>
  )
}
