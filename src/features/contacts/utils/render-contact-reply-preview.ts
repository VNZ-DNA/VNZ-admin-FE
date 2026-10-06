import type { ContactReplyFormValues } from '@/features/contacts/schemas/contact-reply.schema'
import type { ContactDetail, ContactReplyTemplate } from '@/features/contacts/types'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function interpolate(value: string, contact: ContactDetail): string {
  return value.replaceAll('{{contact.fullName}}', escapeHtml(contact.fullName))
}

function renderText(key: string, value: string, contact: ContactDetail): string {
  const rendered = interpolate(value, contact).replaceAll('\n', '<br />')
  if (key === 'heading') return `<h1>${rendered}</h1>`
  if (key === 'eyebrow') return `<p class="email-eyebrow">${rendered}</p>`
  return `<p>${rendered}</p>`
}

function renderRichText(value: string, heading: string, contact: ContactDetail): string {
  if (!value.trim()) return ''

  return `<section class="email-section"><h2>${interpolate(heading, contact)}</h2><div>${value}</div></section>`
}

export function renderContactReplyPreview(
  template: ContactReplyTemplate,
  contact: ContactDetail,
  values: ContactReplyFormValues,
): string {
  const content = template.blocks
    .map((block) => {
      if (block.type === 'logo') {
        return `<img class="email-logo" src="${escapeHtml(template.branding.logoUrl)}" alt="VNZ Technology" />`
      }

      if (block.type === 'footer') {
        return `<footer><strong>${escapeHtml(template.fixedCopy.footer ?? '')}</strong><span>${escapeHtml(template.fixedCopy.footerTagline ?? '')}</span></footer>`
      }

      if (block.type === 'text') {
        const fixedCopyKey = block.fixedCopyKey as keyof ContactReplyTemplate['fixedCopy']
        return renderText(block.key, template.fixedCopy[fixedCopyKey] ?? '', contact)
      }

      const fixedCopyKey = block.fixedCopyKey as keyof ContactReplyTemplate['fixedCopy']
      return renderRichText(values[block.key], template.fixedCopy[fixedCopyKey] ?? '', contact)
    })
    .join('')

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="color-scheme" content="light" /><style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f7f8fa; color: #172033; font-family: ${escapeHtml(template.branding.fontFamily)}, Arial, sans-serif; }
  .email-shell { width: min(100%, ${template.branding.contentMaxWidthPx}px); margin: 0 auto; padding: 40px 28px; background: #fff; }
  .email-logo { display: block; width: auto; max-width: 180px; max-height: 56px; margin: 0 auto 32px; }
  p { margin: 0 0 18px; line-height: 1.7; }
  h1 { margin: 0 0 24px; color: #172033; font-size: 26px; line-height: 1.25; letter-spacing: -0.02em; }
  .email-eyebrow { margin-bottom: 8px; color: ${escapeHtml(template.branding.primaryColor)}; font-size: 12px; font-weight: 700; }
  .email-section { margin: 28px 0; }
  h2 { margin: 0 0 12px; color: ${escapeHtml(template.branding.primaryColor)}; font-size: 16px; line-height: 1.4; }
  .email-section > div { line-height: 1.7; }
  .email-section a { color: ${escapeHtml(template.branding.primaryColor)}; }
  footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 4px; color: #667085; font-size: 12px; }
  footer strong { color: #172033; font-size: 13px; }
</style></head><body><main class="email-shell">${content}</main></body></html>`
}
