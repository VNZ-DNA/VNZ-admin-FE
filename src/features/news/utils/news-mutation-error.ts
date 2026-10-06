import axios from 'axios'

import type { ContentLocale } from '@/lib/content-locale'
import type { ApiResponse } from '@/lib/http/api-response'

export function getNewsMutationErrorDetails(error: unknown): { isConflict: boolean; errorLocales: ContentLocale[] } {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return { isConflict: false, errorLocales: [] }
  }

  const response = error.response
  const isConflict = response?.status === 409 && response.data.errors?.code === 'CONTENT_CONFLICT'
  const fields = response?.status === 400
    ? (response.data.errors?.fields ?? []).map((field) => field.replace(/^\$\./, ''))
    : []
  const errorLocales: ContentLocale[] = []

  if (fields.some((field) => ['title', 'summary', 'content'].includes(field))) errorLocales.push('vi')
  if (fields.some((field) => field === 'translations.en' || field.startsWith('translations.en.'))) errorLocales.push('en')

  return { isConflict, errorLocales }
}
