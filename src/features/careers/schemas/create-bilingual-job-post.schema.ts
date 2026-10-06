import { z } from 'zod'

import { JOB_POST_EMPLOYMENT_TYPES, JOB_POST_LEVELS } from '@/features/careers/types'
import { hasRichTextContent } from '@/features/news/utils/rich-text'

const skillSchema = z.object({
  value: z.string(),
})

const contentSchema = z.object({
  title: z.string().trim().max(300, 'Tiêu đề tối đa 300 ký tự.'),
  shortDescription: z.string(),
  description: z.string(),
  requirements: z.string(),
})

export const createBilingualJobPostFormSchema = contentSchema.extend({
  expiredDate: z.string(),
  departmentId: z.string(),
  employmentType: z.string(),
  jobLevel: z.string(),
  numberOfPositions: z.string(),
  skills: z.array(skillSchema),
  translations: z.object({ en: contentSchema }),
})

export const publishBilingualJobPostSchema = createBilingualJobPostFormSchema.superRefine((values, context) => {
  if (!values.departmentId) {
    context.addIssue({
      code: 'custom',
      path: ['departmentId'],
      message: 'Vui lòng chọn phòng ban.',
    })
  }

  if (!JOB_POST_EMPLOYMENT_TYPES.includes(values.employmentType as never)) {
    context.addIssue({
      code: 'custom',
      path: ['employmentType'],
      message: 'Vui lòng chọn loại hình làm việc.',
    })
  }

  if (!JOB_POST_LEVELS.includes(values.jobLevel as never)) {
    context.addIssue({
      code: 'custom',
      path: ['jobLevel'],
      message: 'Vui lòng chọn cấp bậc.',
    })
  }

  const numberOfPositions = Number(values.numberOfPositions)
  if (
    !values.numberOfPositions.trim() ||
    !Number.isInteger(numberOfPositions) ||
    numberOfPositions < 1
  ) {
    context.addIssue({
      code: 'custom',
      path: ['numberOfPositions'],
      message: 'Chỉ tiêu phải là số nguyên từ 1 trở lên.',
    })
  }

  for (const [content, path] of [
    [values, []],
    [values.translations.en, ['translations', 'en']],
  ] as const) {
    if (!content.title.trim()) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'title'],
        message: 'Vui lòng nhập tiêu đề trước khi đăng tuyển.',
      })
    }

    if (!content.shortDescription.trim()) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'shortDescription'],
        message: 'Vui lòng nhập mô tả ngắn trước khi đăng tuyển.',
      })
    }

    if (!hasRichTextContent(content.description)) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'description'],
        message: 'Vui lòng nhập mô tả công việc trước khi đăng tuyển.',
      })
    }

    if (!hasRichTextContent(content.requirements)) {
      context.addIssue({
        code: 'custom',
        path: [...path, 'requirements'],
        message: 'Vui lòng nhập yêu cầu ứng viên trước khi đăng tuyển.',
      })
    }
  }

  if (!values.expiredDate || !/^\d{4}-\d{2}-\d{2}$/.test(values.expiredDate)) {
    context.addIssue({
      code: 'custom',
      path: ['expiredDate'],
      message: 'Vui lòng chọn ngày hết hạn.',
    })
  }
})

export type CreateBilingualJobPostFormValues = z.infer<typeof createBilingualJobPostFormSchema>
