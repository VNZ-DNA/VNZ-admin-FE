import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type { LoginCredentials, LoginResponse, RefreshResponse } from '@/features/auth/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/api/v1/auth/login',
      {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      },
      { skipAuthRefresh: true },
    )

    return getApiResponseData(response.data)
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await api.post<ApiResponse<RefreshResponse>>(
      '/api/v1/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true },
    )

    return getApiResponseData(response.data)
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post<ApiResponse<null>>(
      '/api/v1/auth/logout',
      { refreshToken },
      { skipAuthRefresh: true },
    )
  },
}
