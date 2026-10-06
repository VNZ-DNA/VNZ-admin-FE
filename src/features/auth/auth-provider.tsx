import { createContext, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'

import { decodeAuthUser, isFutureUtcDate } from '@/features/auth/jwt'
import { authService } from '@/features/auth/services/auth.service'
import { authStorage } from '@/features/auth/storage/auth-storage'
import type { AuthSession, AuthUser, LoginCredentials, RefreshResponse } from '@/features/auth/types'
import { configureApiAuth } from '@/lib/http/axios'

type AuthContextValue = {
  accessToken: string | null
  user: AuthUser | null
  isRestoringSession: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
}

type AuthProviderProps = PropsWithChildren<{
  onForbidden: () => void
  onUnauthenticated: () => void
}>

export const AuthContext = createContext<AuthContextValue | null>(null)

function getSessionFromRefreshResponse(response: RefreshResponse): AuthSession {
  return {
    accessToken: response.accessToken,
    expiresAt: response.expiresAt,
    refreshToken: response.refreshToken,
    refreshTokenExpiresAt: response.refreshTokenExpiresAt,
  }
}

export function AuthProvider({ children, onForbidden, onUnauthenticated }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const refreshPromiseRef = useRef<Promise<string> | null>(null)

  const clearSession = useCallback(() => {
    authStorage.clear()
    setAccessToken(null)
    setUser(null)
  }, [])

  const applySession = useCallback((session: AuthSession): AuthUser => {
    const decodedUser = decodeAuthUser(session.accessToken)

    if (!decodedUser) {
      throw new Error('INVALID_AUTH_SESSION')
    }

    authStorage.set(session)
    setAccessToken(session.accessToken)
    setUser(decodedUser)

    return decodedUser
  }, [])

  const refreshSession = useCallback((): Promise<string> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const session = authStorage.get()

    if (!session || !isFutureUtcDate(session.refreshTokenExpiresAt)) {
      clearSession()
      return Promise.reject(new Error('REFRESH_TOKEN_EXPIRED'))
    }

    refreshPromiseRef.current = authService
      .refresh(session.refreshToken)
      .then((response) => {
        const rotatedSession = getSessionFromRefreshResponse(response)
        applySession(rotatedSession)

        return rotatedSession.accessToken
      })
      .catch((error: unknown) => {
        clearSession()
        throw error
      })
      .finally(() => {
        refreshPromiseRef.current = null
      })

    return refreshPromiseRef.current
  }, [applySession, clearSession])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      const response = await authService.login(credentials)

      return applySession({
        accessToken: response.accessToken,
        expiresAt: response.expiresAt,
        refreshToken: response.refreshToken,
        refreshTokenExpiresAt: response.refreshTokenExpiresAt,
      })
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const session = authStorage.get()

    try {
      if (session?.refreshToken) {
        await authService.logout(session.refreshToken)
      }
    } finally {
      clearSession()
      onUnauthenticated()
    }
  }, [clearSession, onUnauthenticated])

  configureApiAuth({
    getAccessToken: () => authStorage.get()?.accessToken ?? null,
    refreshSession,
    onForbidden,
    onUnauthenticated,
  })

  useEffect(() => {
    let isCurrent = true

    async function restoreSession() {
      const session = authStorage.get()

      if (!session) {
        if (isCurrent) {
          setIsRestoringSession(false)
        }
        return
      }

      if (isFutureUtcDate(session.expiresAt)) {
        try {
          const decodedUser = decodeAuthUser(session.accessToken)

          if (!decodedUser) {
            throw new Error('INVALID_AUTH_SESSION')
          }

          if (isCurrent) {
            setAccessToken(session.accessToken)
            setUser(decodedUser)
          }
        } catch {
          clearSession()
        }
      } else if (isFutureUtcDate(session.refreshTokenExpiresAt)) {
        try {
          await refreshSession()
        } catch {}
      } else {
        clearSession()
      }

      if (isCurrent) {
        setIsRestoringSession(false)
      }
    }

    void restoreSession()

    return () => {
      isCurrent = false
    }
  }, [clearSession, refreshSession])

  return (
    <AuthContext.Provider value={{ accessToken, user, isRestoringSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
