import { z } from 'zod'

const textBlockSchema = z.object({
  key: z.string().min(1),
  type: z.literal('text'),
  fixedCopyKey: z.string().min(1),
})

const richTextBlockSchema = z.object({
  key: z.enum(['body', 'proposalHtml', 'nextStepsHtml']),
  type: z.literal('rich-text'),
  fixedCopyKey: z.string().min(1),
  required: z.boolean(),
})

const contactReplyTemplateSchema = z.object({
  templateKey: z.literal('contact-reply'),
  branding: z.object({
    logoUrl: z.string().url(),
    primaryColor: z.string().min(1),
    fontFamily: z.string().min(1),
    contentMaxWidthPx: z.number().int().positive(),
  }),
  fixedCopy: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    greeting: z.string(),
    opening: z.string(),
    bodyHeading: z.string(),
    proposalHeading: z.string(),
    nextStepsHeading: z.string(),
    closing: z.string(),
    signature: z.string(),
    footer: z.string(),
    footerTagline: z.string(),
  }),
  blocks: z.array(
    z.discriminatedUnion('type', [
      z.object({ key: z.literal('logo'), type: z.literal('logo') }),
      textBlockSchema,
      richTextBlockSchema,
      z.object({ key: z.literal('footer'), type: z.literal('footer') }),
    ]),
  ).min(1),
  richTextPolicy: z.object({
    allowedTags: z.array(z.string()),
    allowedLinkProtocols: z.array(z.string()),
    maxHtmlLength: z.number().int().positive(),
  }),
})

export function parseContactReplyTemplate(value: unknown) {
  return contactReplyTemplateSchema.parse(value)
}
