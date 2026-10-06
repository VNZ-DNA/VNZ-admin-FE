import { z } from 'zod'

import type { InterviewInvitationTemplate } from '@/features/applicants/types'

const fixedCopyKeys = z.enum([
  'subject',
  'greeting',
  'opening',
  'interviewInformationHeading',
  'agendaHeading',
  'preparationHeading',
  'confirmationCopy',
  'closing',
  'signature',
])

const interviewInvitationTemplateSchema = z.object({
  templateKey: z.literal('interview-invitation'),
  branding: z.object({
    logoUrl: z.string().url(),
    primaryColor: z.string().min(1),
    fontFamily: z.string().min(1),
    contentMaxWidthPx: z.number().positive(),
  }),
  fixedCopy: z.object({
    subject: z.string(),
    greeting: z.string(),
    opening: z.string(),
    interviewInformationHeading: z.string(),
    agendaHeading: z.string(),
    preparationHeading: z.string(),
    confirmationCopy: z.string(),
    closing: z.string(),
    signature: z.string(),
  }),
  blocks: z.array(
    z.discriminatedUnion('type', [
      z.object({ key: z.string().min(1), type: z.literal('logo') }),
      z.object({
        key: z.string().min(1),
        type: z.literal('text'),
        fixedCopyKey: fixedCopyKeys.optional(),
        value: z.string().optional(),
      }),
      z.object({ key: z.string().min(1), type: z.literal('interview-info') }),
      z.object({
        key: z.enum(['interviewInformationHtml', 'agendaHtml', 'preparationHtml']),
        type: z.literal('rich-text'),
        heading: z.string().optional(),
        required: z.boolean(),
      }),
    ]),
  ).min(1),
  deadlinePolicy: z.object({
    timezone: z.string().min(1),
    daysBeforeInterview: z.number().int().nonnegative(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    displayFormat: z.string().min(1),
  }),
  richTextPolicy: z.object({
    allowedTags: z.array(z.string().min(1)).min(1),
    allowedLinkProtocols: z.array(z.string().min(1)).min(1),
    maxHtmlLength: z.number().int().positive(),
  }),
})

export function parseInterviewInvitationTemplate(value: unknown): InterviewInvitationTemplate {
  const result = interviewInvitationTemplateSchema.safeParse(value)

  if (!result.success) {
    throw new Error('Template email mời phỏng vấn không đúng contract.')
  }

  return result.data as InterviewInvitationTemplate
}
