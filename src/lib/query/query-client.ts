import { QueryClient } from '@tanstack/react-query'

import { isRateLimitError } from '@/lib/http/rate-limit'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isRateLimitError(error) && failureCount < 3,
    },
    mutations: {
      retry: false,
    },
  },
})
