export interface AuthSession {
  accessToken: string
  expiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface AuthUser {
  id: string
  email: string
  role: string
  fullName: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse extends AuthSession {
  tokenType: string
  fullName: string
}

export interface RefreshResponse extends AuthSession {}
