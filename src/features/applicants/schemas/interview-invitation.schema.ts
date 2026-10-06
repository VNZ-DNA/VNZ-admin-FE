import { z } from 'zod'

const MAX_RICH_TEXT_LENGTH = 20_000

function hasVisibleRichText(value: string): boolean {
  const withoutTags = value.replace(/<[^>]*>/g, ' ')
  const normalized = withoutTags
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.length > 0
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isFutureVietnamInterviewTime(interviewDate: string, interviewTime: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(interviewDate) || !/^\d{2}:\d{2}$/.test(interviewTime)) {
    return false
  }

  const date = new Date(`${interviewDate}T${interviewTime}:00+07:00`)
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
}

export const interviewInvitationFormSchema = z
  .object({
    interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vui lòng chọn ngày phỏng vấn.'),
    interviewTime: z.string().regex(/^\d{2}:\d{2}$/, 'Vui lòng chọn giờ phỏng vấn.'),
    durationMinutes: z
      .number({ error: 'Vui lòng nhập thời lượng phỏng vấn.' })
      .int('Thời lượng phải là số phút nguyên.')
      .positive('Thời lượng phải lớn hơn 0 phút.'),
    interviewMode: z.enum(['Onsite', 'Online']),
    location: z.string().max(500, 'Địa điểm tối đa 500 ký tự.'),
    locationUrl: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập link địa điểm hoặc link họp.')
      .refine(isHttpsUrl, 'Link phải là URL HTTPS hợp lệ.'),
    interviewInformationHtml: z
      .string()
      .max(MAX_RICH_TEXT_LENGTH, `Nội dung bổ sung tối đa ${MAX_RICH_TEXT_LENGTH.toLocaleString('vi-VN')} ký tự.`),
    agendaHtml: z
      .string()
      .max(MAX_RICH_TEXT_LENGTH, `Nội dung buổi phỏng vấn tối đa ${MAX_RICH_TEXT_LENGTH.toLocaleString('vi-VN')} ký tự.`)
      .refine(hasVisibleRichText, 'Vui lòng nhập nội dung buổi phỏng vấn.'),
    preparationHtml: z
      .string()
      .max(MAX_RICH_TEXT_LENGTH, `Nội dung chuẩn bị tối đa ${MAX_RICH_TEXT_LENGTH.toLocaleString('vi-VN')} ký tự.`)
      .refine(hasVisibleRichText, 'Vui lòng nhập nội dung ứng viên cần chuẩn bị.'),
  })
  .superRefine((values, context) => {
    if (!isFutureVietnamInterviewTime(values.interviewDate, values.interviewTime)) {
      context.addIssue({
        code: 'custom',
        path: ['interviewDate'],
        message: 'Thời gian phỏng vấn phải lớn hơn thời điểm hiện tại theo giờ Việt Nam.',
      })
      context.addIssue({
        code: 'custom',
        path: ['interviewTime'],
        message: 'Thời gian phỏng vấn phải lớn hơn thời điểm hiện tại theo giờ Việt Nam.',
      })
    }

    if (values.interviewMode === 'Onsite' && !values.location.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['location'],
        message: 'Vui lòng nhập địa chỉ phỏng vấn trực tiếp.',
      })
    }
  })

export type InterviewInvitationFormValues = z.infer<typeof interviewInvitationFormSchema>
export { MAX_RICH_TEXT_LENGTH }
