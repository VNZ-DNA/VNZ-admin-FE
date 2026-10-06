import { afterEach, describe, expect, it, vi } from 'vitest'

import { newsService } from '@/features/news/services/news.service'
import { api } from '@/lib/http/axios'

afterEach(() => vi.restoreAllMocks())

describe('News create service', () => {
  it('serializes VI and EN fields as the bilingual multipart contract', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'Created',
        data: { id: 'news-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-05T08:30:15.654321+00:00',
      },
    })

    await newsService.createNewsArticle({
      title: 'Tiêu đề VI',
      summary: '<p>Mô tả VI</p>',
      content: '<p>Nội dung VI</p>',
      categoryIds: ['category-id'],
      status: 'Draft',
      translations: { en: { title: 'English title', summary: '<p>English summary</p>', content: '<p>English content</p>' } },
      image: null,
    })

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.get('status')).toBe('Draft')
    expect(body.get('title')).toBe('Tiêu đề VI')
    expect(body.get('summary')).toBe('<p>Mô tả VI</p>')
    expect(body.get('content')).toBe('<p>Nội dung VI</p>')
    expect(body.get('translations.en.title')).toBe('English title')
    expect(body.get('translations.en.summary')).toBe('<p>English summary</p>')
    expect(body.get('translations.en.content')).toBe('<p>English content</p>')
    expect(body.getAll('categoryIds')).toEqual(['category-id'])
    expect(body.has('expectedUpdatedAt')).toBe(false)
  })

  it('omits optional empty Draft fields instead of sending fake content', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'Created',
        data: { id: 'news-id' },
        errors: null,
        traceId: null,
        timestampUtc: '2026-10-05T08:30:15.654321+00:00',
      },
    })

    await newsService.createNewsArticle({
      title: null, summary: null, content: null, categoryIds: [], status: 'Draft',
      translations: { en: { title: null, summary: null, content: null } }, image: null,
    })

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.has('title')).toBe(false)
    expect(body.has('summary')).toBe(false)
    expect(body.has('content')).toBe(false)
    expect(body.has('translations.en.title')).toBe(false)
    expect(body.has('translations.en.summary')).toBe(false)
    expect(body.has('translations.en.content')).toBe(false)
    expect(body.get('status')).toBe('Draft')
  })
})
