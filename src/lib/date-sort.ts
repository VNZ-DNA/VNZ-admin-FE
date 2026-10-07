import axios from 'axios'
import type { ApiResponse } from '@/lib/http/api-response'

export type DateSortDirection = 'asc' | 'desc'

export function getDateSortError(error: unknown, code: string, field: string): string | null {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error) || error.response?.status !== 400) return null
  const response = error.response.data
  if (response.errors?.code !== code || !response.errors.fields.includes(field)) return null
  return response.message || 'Hướng sắp xếp không hợp lệ. Vui lòng chọn lại.'
}
