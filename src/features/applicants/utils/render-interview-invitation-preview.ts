import type {
  InterviewInvitationFormValues,
} from '@/features/applicants/schemas/interview-invitation.schema'
import type {
  InterviewInvitationTemplate,
  InterviewInvitationTemplateBlock,
  JobApplicationListItem,
} from '@/features/applicants/types'

type PreviewInput = {
  template: InterviewInvitationTemplate
  applicant: JobApplicationListItem
  values: Partial<InterviewInvitationFormValues>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInterviewDate(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return '—'

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatDeadline(
  interviewDate: string | undefined,
  policy: InterviewInvitationTemplate['deadlinePolicy'],
): string {
  if (!interviewDate || !/^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) return '—'

  const deadline = new Date(`${interviewDate}T${policy.time}:00+07:00`)
  if (Number.isNaN(deadline.getTime())) return '—'

  deadline.setUTCDate(deadline.getUTCDate() - policy.daysBeforeInterview)

  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: policy.timezone,
  }).formatToParts(deadline)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''

  return policy.displayFormat
    .replace('HH', part('hour'))
    .replace('mm', part('minute'))
    .replace('dd', part('day'))
    .replace('MM', part('month'))
    .replace('yyyy', part('year'))
    .replace(/'([^']+)'/g, '$1')
}

function replacePlaceholders(value: string, applicant: JobApplicationListItem, deadline: string): string {
  return escapeHtml(value)
    .replaceAll('{{candidate.fullName}}', escapeHtml(applicant.fullName))
    .replaceAll('{{candidate.positionTitle}}', escapeHtml(applicant.jobPostSnapshotTitle ?? applicant.jobPostTitle))
    .replaceAll('{{deadline}}', escapeHtml(deadline))
}

function getTextBlockValue(
  block: Extract<InterviewInvitationTemplateBlock, { type: 'text' }>,
  template: InterviewInvitationTemplate,
): string {
  return block.fixedCopyKey ? template.fixedCopy[block.fixedCopyKey] : block.value ?? ''
}

function renderInterviewInfo(
  values: Partial<InterviewInvitationFormValues>,
  template: InterviewInvitationTemplate,
): string {
  const mode = values.interviewMode === 'Online' ? 'Online' : 'Trực tiếp tại văn phòng'
  const place = values.interviewMode === 'Online' ? 'Link họp' : 'Địa điểm'
  const placeValue = values.interviewMode === 'Online' ? values.locationUrl : values.location
  const interviewDate = formatInterviewDate(values.interviewDate)

  return `
    <section class="email-card">
      <h2>${escapeHtml(template.fixedCopy.interviewInformationHeading)}</h2>
      <table>
        <tr><th>Thời gian</th><td>${escapeHtml(`${values.interviewTime || '—'} ngày ${interviewDate}`)}</td></tr>
        <tr><th>Thời lượng</th><td>${values.durationMinutes ? `${values.durationMinutes} phút` : '—'}</td></tr>
        <tr><th>Hình thức</th><td>${escapeHtml(mode)}</td></tr>
        <tr><th>${escapeHtml(place)}</th><td>${escapeHtml(placeValue || '—')}</td></tr>
      </table>
    </section>`
}

function renderBlock(
  block: InterviewInvitationTemplateBlock,
  input: PreviewInput,
  deadline: string,
): string {
  switch (block.type) {
    case 'logo':
      return `<img class="email-logo" src="${escapeHtml(input.template.branding.logoUrl)}" alt="VNZ Technology" />`
    case 'text':
      return `<p class="email-text">${replacePlaceholders(getTextBlockValue(block, input.template), input.applicant, deadline).replaceAll('\n', '<br />')}</p>`
    case 'interview-info':
      return renderInterviewInfo(input.values, input.template)
    case 'rich-text': {
      const value = input.values[block.key] ?? ''
      if (!value.trim() && !block.required) return ''
      const heading =
        block.heading ||
        (block.key === 'agendaHtml'
          ? input.template.fixedCopy.agendaHeading
          : block.key === 'preparationHtml'
            ? input.template.fixedCopy.preparationHeading
            : '')
      return `<section class="email-rich-text">${heading ? `<h2>${escapeHtml(heading)}</h2>` : ''}${value || '<p>—</p>'}</section>`
    }
  }
}

export function buildInterviewInvitationPreviewHtml(input: PreviewInput): string {
  const { template } = input
  const deadline = formatDeadline(input.values.interviewDate, template.deadlinePolicy)
  const content = template.blocks
    .filter((block) => block.type !== 'text' || block.fixedCopyKey !== 'greeting')
    .map((block) => renderBlock(block, input, deadline))
    .join('')

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #f3f4f6; color: #293241; font-family: ${escapeHtml(template.branding.fontFamily)}; }
      main { max-width: ${template.branding.contentMaxWidthPx}px; margin: 0 auto; background: #fff; padding: 34px 38px 42px; }
      .email-logo { display: block; width: 112px; max-height: 44px; margin: 0 auto 28px; object-fit: contain; object-position: center center; }
      .email-text, .email-rich-text { margin: 0 0 18px; font-size: 14px; line-height: 1.7; }
      .email-card { margin: 24px 0; border-left: 3px solid ${escapeHtml(template.branding.primaryColor)}; background: #fff8f4; padding: 18px 20px; }
      h2 { margin: 0 0 12px; color: #1f2937; font-size: 16px; line-height: 1.35; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5; }
      th, td { border-top: 1px solid #f0dfd6; padding: 9px 0; text-align: left; vertical-align: top; }
      th { width: 34%; color: #6b7280; font-weight: 600; }
      td { color: #293241; }
      .email-rich-text ul, .email-rich-text ol { padding-left: 22px; }
      .email-rich-text a { color: ${escapeHtml(template.branding.primaryColor)}; }
      @media (max-width: 520px) { main { padding: 24px 20px 30px; } th { width: 42%; } }
    </style>
  </head>
  <body><main>${content}</main></body>
</html>`
}
