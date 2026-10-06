import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type { DashboardData } from '@/features/dashboard/types'

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get<ApiResponse<DashboardData>>('/api/v1/admin/dashboard')

    return getApiResponseData(response.data)
  },
}
