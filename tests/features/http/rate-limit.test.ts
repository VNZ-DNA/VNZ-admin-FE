import { describe, expect, it } from 'vitest'

import { getRateLimitErrorInfo } from '@/lib/http/rate-limit'
import { queryClient } from '@/lib/query/query-client'

describe('admin rate limit handling', () => {
  it('uses the backend message and Retry-After header for HTTP 429', () => {
    const info = getRateLimitErrorInfo({
      response: {
        status: 429,
        data: { message: 'Quá nhiều yêu cầu.' },
        headers: { 'retry-after': '17' },
      },
    }, 'Không thể thực hiện thao tác.')

    expect(info).toEqual({
      isRateLimited: true,
      message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 17 giây.',
      retryAfterSeconds: 17,
    })
  })

  it('falls back when a rate-limited response has no message or header', () => {
    const info = getRateLimitErrorInfo({ response: { status: 429, data: {} } }, 'Không thể thực hiện thao tác.')

    expect(info).toEqual({
      isRateLimited: true,
      message: 'Không thể thực hiện thao tác.',
      retryAfterSeconds: null,
    })
  })

  it('prevents query retries for rate-limited responses while retaining bounded retries for other errors', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry as ((failureCount: number, error: unknown) => boolean)

    expect(retry(0, { response: { status: 429 } })).toBe(false)
    expect(retry(0, { response: { status: 500 } })).toBe(true)
    expect(retry(3, { response: { status: 500 } })).toBe(false)
  })
})
