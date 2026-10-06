import { useQuery } from '@tanstack/react-query'

import { dashboardService } from '@/features/dashboard/services/dashboard.service'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboard,
  })
}
