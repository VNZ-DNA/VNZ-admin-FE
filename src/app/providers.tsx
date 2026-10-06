import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from '@/features/auth/auth-provider'
import { queryClient } from '@/lib/query/query-client'

type AppProvidersProps = PropsWithChildren<{
  onForbidden: () => void
  onUnauthenticated: () => void
}>

export function AppProviders({ children, onForbidden, onUnauthenticated }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider onForbidden={onForbidden} onUnauthenticated={onUnauthenticated}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
