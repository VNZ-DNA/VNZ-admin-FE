import type { AuthSession } from '@/features/auth/types'

const AUTH_SESSION_KEY = 'vnz-admin-auth-session'

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const session = value as Record<string, unknown>

  return (
    typeof session.accessToken === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.refreshTokenExpiresAt === 'string'
  )
}

function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const authStorage = {
  get(): AuthSession | null {
    const storage = getStorage()

    if (!storage) {
      return null
    }

    try {
      const rawSession = storage.getItem(AUTH_SESSION_KEY)

      if (!rawSession) {
        return null
      }

      const session: unknown = JSON.parse(rawSession)

      if (!isSession(session)) {
        storage.removeItem(AUTH_SESSION_KEY)
        return null
      }

      return session
    } catch {
      try {
        storage.removeItem(AUTH_SESSION_KEY)
      } catch {}

      return null
    }
  },

  set(session: AuthSession): void {
    const storage = getStorage()

    if (!storage) {
      return
    }

    try {
      storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
    } catch {}
  },

  clear(): void {
    const storage = getStorage()

    if (!storage) {
      return
    }

    try {
      storage.removeItem(AUTH_SESSION_KEY)
    } catch {}
  },
}

export { AUTH_SESSION_KEY }
