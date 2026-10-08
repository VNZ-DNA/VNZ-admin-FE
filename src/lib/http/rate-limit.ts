export const DEFAULT_RATE_LIMIT_MESSAGE = 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'

type HttpErrorLike = {
  response?: {
    status?: number
    data?: unknown
    headers?: unknown
  }
}

export type RateLimitErrorInfo = {
  isRateLimited: boolean
  message: string
  retryAfterSeconds: number | null
}

function getResponse(error: unknown): HttpErrorLike['response'] | null {
  if (!error || typeof error !== 'object') return null
  return (error as HttpErrorLike).response ?? null
}

function getHeaderValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null

  const headerBag = headers as {
    get?: (headerName: string) => unknown
    [key: string]: unknown
  }

  if (typeof headerBag.get === 'function') {
    const value = headerBag.get(name)
    if (value !== undefined && value !== null) return String(value)
  }

  const value = headerBag[name.toLowerCase()] ?? headerBag[name]
  return value === undefined || value === null ? null : String(value)
}

export function isRateLimitError(error: unknown): boolean {
  return getResponse(error)?.status === 429
}

export function getRetryAfterSeconds(error: unknown): number | null {
  const response = getResponse(error)
  if (response?.status !== 429) return null

  const rawValue = getHeaderValue(response.headers, 'Retry-After')
  const seconds = Number.parseInt(rawValue ?? '', 10)

  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function appendRetryAfterMessage(message: string, retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds) return message

  const waitPattern = new RegExp(`${retryAfterSeconds}\\s*(giây|seconds?)`, 'i')
  return waitPattern.test(message)
    ? message
    : `${message} Vui lòng thử lại sau ${retryAfterSeconds} giây.`
}

export function getRateLimitErrorInfo(error: unknown, fallback = DEFAULT_RATE_LIMIT_MESSAGE): RateLimitErrorInfo {
  const response = getResponse(error)
  if (response?.status !== 429) {
    return { isRateLimited: false, message: fallback, retryAfterSeconds: null }
  }

  const responseData = response.data
  const responseMessage = responseData && typeof responseData === 'object' && 'message' in responseData
    ? (responseData as { message?: unknown }).message
    : null
  const message = typeof responseMessage === 'string' && responseMessage.trim()
    ? responseMessage.trim()
    : fallback || DEFAULT_RATE_LIMIT_MESSAGE
  const retryAfterSeconds = getRetryAfterSeconds(error)

  return {
    isRateLimited: true,
    message: appendRetryAfterMessage(message, retryAfterSeconds),
    retryAfterSeconds,
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const rateLimitInfo = getRateLimitErrorInfo(error, fallback)
  if (rateLimitInfo.isRateLimited) return rateLimitInfo.message

  const response = getResponse(error)
  const responseData = response?.data
  if (responseData && typeof responseData === 'object' && 'message' in responseData) {
    const responseMessage = (responseData as { message?: unknown }).message
    if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
