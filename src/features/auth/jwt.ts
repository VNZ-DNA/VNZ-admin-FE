import type { AuthUser } from '@/features/auth/types'

const dotNetClaimKeys = {
  id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  fullName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
} as const

function decodeBase64Url(value: string): string | null {
  try {
    const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/')
    const paddedValue = normalizedValue.padEnd(Math.ceil(normalizedValue.length / 4) * 4, '=')
    const binary = window.atob(paddedValue)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function decodeAuthUser(accessToken: string): AuthUser | null {
  const payload = accessToken.split('.')[1]

  if (!payload) {
    return null
  }

  const decodedPayload = decodeBase64Url(payload)

  if (!decodedPayload) {
    return null
  }

  try {
    const claims: unknown = JSON.parse(decodedPayload)

    if (typeof claims !== 'object' || claims === null) {
      return null
    }

    const user = claims as Record<string, unknown>
    const id = user[dotNetClaimKeys.id]
    const email = user[dotNetClaimKeys.email]
    const role = user[dotNetClaimKeys.role]
    const fullName = user[dotNetClaimKeys.fullName]

    if (
      typeof id !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      typeof fullName !== 'string'
    ) {
      return null
    }

    return {
      id,
      email,
      role,
      fullName,
    }
  } catch {
    return null
  }
}

export function isFutureUtcDate(value: string): boolean {
  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) && timestamp > Date.now()
}
