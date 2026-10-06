export interface ApiErrorDetails {
  code: string
  fields: string[]
}

export interface ApiResponse<T> {
  isSuccess: boolean
  message: string
  data: T | null
  errors: ApiErrorDetails | null
  traceId: string | null
  timestampUtc: string
}

export class ApiResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiResponseError'
  }
}

export function getApiResponseData<T>(response: ApiResponse<T>): T {
  if (!response.isSuccess || response.data === null) {
    throw new ApiResponseError(response.message || 'Không thể xử lý yêu cầu.')
  }

  return response.data
}
