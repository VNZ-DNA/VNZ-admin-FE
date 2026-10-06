import { describe, expect, it } from 'vitest'

import { getNewsMutationErrorDetails } from '@/features/news/utils/news-mutation-error'

function apiError(status: number, code: string, fields: string[]) {
  return { isAxiosError: true, response: { status, data: { errors: { code, fields } } } }
}

describe('getNewsMutationErrorDetails', () => {
  it('marks both languages from normalized field paths regardless of their order', () => {
    expect(getNewsMutationErrorDetails(apiError(400, 'BILINGUAL_CONTENT_REQUIRED', [
      '$.translations.en.content', 'title', 'translations.en.summary',
    ]))).toEqual({ isConflict: false, errorLocales: ['vi', 'en'] })
  })

  it('does not assign metadata errors or unsupported translation locales to a content tab', () => {
    expect(getNewsMutationErrorDetails(apiError(400, 'BILINGUAL_SCHEMA_INVALID', [
      'categoryIds', 'status', 'translations.fr.title',
    ])).errorLocales).toEqual([])
  })

  it('only requests conflict recovery for the specified 409 code', () => {
    expect(getNewsMutationErrorDetails(apiError(409, 'CONTENT_CONFLICT', [])).isConflict).toBe(true)
    expect(getNewsMutationErrorDetails(apiError(409, 'NEWS_ARTICLE_CLOSED', [])).isConflict).toBe(false)
    expect(getNewsMutationErrorDetails(new Error('Network error'))).toEqual({ isConflict: false, errorLocales: [] })
  })
})
