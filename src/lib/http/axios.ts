import axios, { type InternalAxiosRequestConfig } from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    _hasRetriedAfterRefresh?: boolean
    skipAuthRefresh?: boolean
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

type AuthInterceptorHandlers = {
  getAccessToken: () => string | null
  refreshSession: () => Promise<string>
  onUnauthenticated: () => void
  onForbidden: () => void
}

let authHandlers: AuthInterceptorHandlers | null = null

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url?.startsWith('/api/v1/auth/'))
}

export function configureApiAuth(handlers: AuthInterceptorHandlers): void {
  authHandlers = handlers
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isAuthEndpoint(config.url)) {
    const accessToken = authHandlers?.getAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const request = error.config
    const status = error.response?.status

    if (request.skipAuthRefresh || isAuthEndpoint(request.url)) {
      return Promise.reject(error)
    }

    if (status === 403) {
      authHandlers?.onForbidden()
      return Promise.reject(error)
    }

    if (status !== 401 || request._hasRetriedAfterRefresh || !authHandlers) {
      return Promise.reject(error)
    }

    request._hasRetriedAfterRefresh = true

    try {
      const accessToken = await authHandlers.refreshSession()
      request.headers.Authorization = `Bearer ${accessToken}`

      return api(request)
    } catch {
      authHandlers.onUnauthenticated()
      return Promise.reject(error)
    }
  },
)
