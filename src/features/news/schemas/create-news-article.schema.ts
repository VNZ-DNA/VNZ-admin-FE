import { z } from 'zod'

import { countRichTextCharacters, hasRichTextContent } from '@/features/news/utils/rich-text'

const contentSchema = z.object({
  title: z
    .string()
    .trim()
    .max(300, 'Tiêu đề không được quá 300 ký tự.')
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), 'Tiêu đề chỉ được nhập văn bản thường, không dùng HTML.'),
  summary: z.string(),
  content: z.string(),
})

export const createNewsArticleFormSchema = contentSchema.extend({
  categoryIds: z.array(z.string()).refine((ids) => new Set(ids).size === ids.length, 'Thể loại không được trùng lặp.'),
  translations: z.object({ en: contentSchema }),
})

export const publishNewsArticleSchema = createNewsArticleFormSchema.superRefine((values, context) => {
  for (const [content, path] of [
    [values, []],
    [values.translations.en, ['translations', 'en']],
  ] as const) {
    if (!content.title) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'title'],
        message: 'Vui lòng nhập tiêu đề bài viết trước khi đăng.',
      })
    }

    if (!hasRichTextContent(content.summary)) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'summary'],
        message: 'Vui lòng nhập mô tả ngắn trước khi đăng bài.',
      })
    }

    if (countRichTextCharacters(content.content) < 300) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'content'],
        message: 'Nội dung phải có ít nhất 300 ký tự không phải khoảng trắng để đăng bài.',
      })
    }
  }

  if (values.categoryIds.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['categoryIds'],
      message: 'Vui lòng chọn ít nhất một thể loại trước khi đăng bài.',
    })
  }
})

export type CreateNewsArticleFormValues = z.infer<typeof createNewsArticleFormSchema>
