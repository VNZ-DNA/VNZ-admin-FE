import { describe, expect, it } from 'vitest'

import { selectNewsContent } from '@/features/news/utils/news-content-locale'

describe('selectNewsContent', () => {
  it('does not fall back to Vietnamese when the English translation is missing', () => {
    const content = selectNewsContent(
      {
        title: 'Tiêu đề tiếng Việt',
        summary: '<p>Tóm tắt tiếng Việt</p>',
        content: '<p>Nội dung tiếng Việt</p>',
        translations: null,
      },
      'en',
    )

    expect(content).toEqual({ title: null, summary: null, content: null })
  })
})
