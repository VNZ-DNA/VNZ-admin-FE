import { z } from 'zod'

export const CONTACT_REPLY_SUBJECT_MAX_LENGTH = 200
export const CONTACT_REPLY_RICH_TEXT_MAX_LENGTH = 20_000

function hasVisibleRichText(value: string): boolean {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0
}

function looksLikeHtml(value: string): boolean {
  return /<\s*\/?\s*[a-z][^>]*>/i.test(value)
}

const requiredRichText = (label: string) =>
  z
    .string()
    .max(CONTACT_REPLY_RICH_TEXT_MAX_LENGTH, `${label} không được vượt quá 20.000 ký tự HTML.`)
    .refine(hasVisibleRichText, `${label} là bắt buộc.`)

const optionalRichText = (label: string) =>
  z
    .string()
    .max(CONTACT_REPLY_RICH_TEXT_MAX_LENGTH, `${label} không được vượt quá 20.000 ký tự HTML.`)

export const contactReplyFormSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Tiêu đề email là bắt buộc.')
    .max(CONTACT_REPLY_SUBJECT_MAX_LENGTH, 'Tiêu đề email không được vượt quá 200 ký tự.')
    .refine((value) => !/[\r\n]/.test(value), 'Tiêu đề email không được chứa ký tự xuống dòng.')
    .refine((value) => !looksLikeHtml(value), 'Tiêu đề email không được chứa HTML.'),
  body: requiredRichText('Nội dung phản hồi'),
  proposalHtml: optionalRichText('Phương án đề xuất'),
  nextStepsHtml: optionalRichText('Bước tiếp theo'),
})

export type ContactReplyFormValues = z.infer<typeof contactReplyFormSchema>

export function isRichTextEmpty(value: string): boolean {
  return !hasVisibleRichText(value)
}
