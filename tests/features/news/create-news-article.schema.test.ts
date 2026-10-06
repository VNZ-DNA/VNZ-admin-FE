import { describe, expect, it } from 'vitest'

import { createNewsArticleFormSchema, publishNewsArticleSchema } from '@/features/news/schemas/create-news-article.schema'

const complete = {
  title: 'VI', summary: '<p>VI summary</p>', content: `<p>${'v'.repeat(300)}</p>`, categoryIds: ['category-id'],
  translations: { en: { title: 'EN', summary: '<p>EN summary</p>', content: `<p>${'e'.repeat(300)}</p>` } },
}

describe('News Create bilingual validation', () => {
  it('allows partial VI and EN content in Draft', () => {
    expect(createNewsArticleFormSchema.safeParse({
      title: '', summary: '', content: '', categoryIds: [], translations: { en: { title: '', summary: '', content: '' } },
    }).success).toBe(true)
  })

  it('requires all translatable fields in both languages when publishing', () => {
    const result = publishNewsArticleSchema.safeParse({ ...complete, translations: { en: { title: '', summary: '', content: '' } } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual([
        'translations.en.title', 'translations.en.summary', 'translations.en.content',
      ])
    }
  })

  it('rejects an HTML or overlong title in either locale', () => {
    for (const field of ['title', 'translations'] as const) {
      const values = field === 'title'
        ? { ...complete, title: '<b>VI</b>' }
        : { ...complete, translations: { en: { ...complete.translations.en, title: 'a'.repeat(301) } } }
      expect(createNewsArticleFormSchema.safeParse(values).success).toBe(false)
    }
  })
})
