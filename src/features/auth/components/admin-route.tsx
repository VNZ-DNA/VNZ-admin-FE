import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/features/auth/use-auth'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function AdminRoute() {
  const { isRestoringSession, user } = useAuth()

  if (isRestoringSession) {
    return <main className="auth-session-loading">Đang khôi phục phiên đăng nhập...</main>
  }

  if (!user) {
    return <Navigate replace to={ROUTE_PATHS.LOGIN} />
  }

  if (user.role !== 'Admin') {
    return <Navigate replace to={ROUTE_PATHS.FORBIDDEN} />
  }

  return <Outlet />
}
