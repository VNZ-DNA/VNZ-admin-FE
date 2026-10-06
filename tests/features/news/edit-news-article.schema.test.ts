import { describe, expect, it } from 'vitest'

import { editNewsArticleFormSchema, publishEditedNewsArticleSchema } from '@/features/news/schemas/edit-news-article.schema'

const complete = {
  title: 'VI', summary: '<p>Tóm tắt</p>', content: `<p>${'v'.repeat(300)}</p>`, categoryIds: ['category-id'],
  translations: { en: { title: 'EN', summary: '<p>Summary</p>', content: `<p>${'e'.repeat(300)}</p>` } },
}

describe('News Edit validation', () => {
  it('allows partial VI and EN in Draft', () => {
    expect(editNewsArticleFormSchema.safeParse({ ...complete, title: '', summary: '', content: '', categoryIds: [], translations: { en: { title: 'EN draft', summary: '', content: '' } } }).success).toBe(true)
  })

  it.each([
    { title: '<b>Title</b>', name: 'HTML' },
    { title: 'a'.repeat(301), name: 'overlong title' },
  ])('rejects $name even in a Draft translation', ({ title }) => {
    const result = editNewsArticleFormSchema.safeParse({ ...complete, translations: { en: { ...complete.translations.en, title } } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['translations', 'en', 'title'])
  })

  it.each([
    { content: `<p>${'e'.repeat(299)} \t \n</p>`, valid: false },
    { content: '<p><img src="https://example.com/image.jpg" /></p>', valid: false },
    { content: `<p>${'e'.repeat(300)}</p>`, valid: true },
  ])('checks the EN publish content boundary: $valid', ({ content, valid }) => {
    expect(publishEditedNewsArticleSchema.safeParse({ ...complete, translations: { en: { ...complete.translations.en, content } } }).success).toBe(valid)
  })

  it('requires a readable summary in each language when publishing', () => {
    const result = publishEditedNewsArticleSchema.safeParse({ ...complete, summary: '<p><br></p>', translations: { en: { ...complete.translations.en, summary: ' ' } } })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(['summary', 'translations.en.summary'])
  })

  it('rejects missing categories on Publish and duplicate categories on Draft', () => {
    expect(publishEditedNewsArticleSchema.safeParse({ ...complete, categoryIds: [] }).success).toBe(false)
    expect(editNewsArticleFormSchema.safeParse({ ...complete, categoryIds: ['same', 'same'] }).success).toBe(false)
  })
})
