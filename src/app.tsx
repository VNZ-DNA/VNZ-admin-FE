import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/app/providers'
import { router } from '@/routes/router'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function App() {
  return (
    <AppProviders
      onForbidden={() => {
        void router.navigate(ROUTE_PATHS.FORBIDDEN, { replace: true })
      }}
      onUnauthenticated={() => {
        void router.navigate(ROUTE_PATHS.LOGIN, { replace: true })
      }}
    >
      <RouterProvider router={router} />
    </AppProviders>
  )
}
