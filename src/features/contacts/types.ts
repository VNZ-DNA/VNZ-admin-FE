export type ContactStatusFilter = 'Chưa liên hệ' | 'Đã liên hệ'

export interface ContactListItem {
  id: string
  fullName: string
  companyName: string | null
  email: string
  createdAt: string
  isRead: boolean
  contactStatus: ContactStatusFilter
}

export interface ContactPagedResult {
  items: ContactListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface DeleteContactResult {
  id: string
}

export interface GetContactsParams {
  search?: string
  status?: ContactStatusFilter[]
  isRead?: boolean[]
  page: number
  pageSize: number
}

export interface ContactDetail {
  id: string
  fullName: string
  email: string
  phone: string | null
  companyName: string | null
  inquiryTopic: string
  budgetRange: string | null
  expectedStart: string | null
  message: string | null
  source: string | null
  createdAt: string
  isRead: boolean
  contactStatus: ContactStatusFilter
  canSendEmail: boolean
}

export interface SendContactReplyRequest {
  subject: string
  body: string
  proposalHtml?: string
  nextStepsHtml?: string
}

export interface ContactReplyTemplateBranding {
  logoUrl: string
  primaryColor: string
  fontFamily: string
  contentMaxWidthPx: number
}

export type ContactReplyTemplateBlock =
  | { key: 'logo'; type: 'logo' }
  | { key: string; type: 'text'; fixedCopyKey: string }
  | { key: 'body' | 'proposalHtml' | 'nextStepsHtml'; type: 'rich-text'; fixedCopyKey: string; required: boolean }
  | { key: 'footer'; type: 'footer' }

export interface ContactReplyTemplate {
  templateKey: 'contact-reply'
  branding: ContactReplyTemplateBranding
  fixedCopy: {
    eyebrow: string
    heading: string
    greeting: string
    opening: string
    bodyHeading: string
    proposalHeading: string
    nextStepsHeading: string
    closing: string
    signature: string
    footer: string
    footerTagline: string
  }
  blocks: ContactReplyTemplateBlock[]
  richTextPolicy: {
    allowedTags: string[]
    allowedLinkProtocols: string[]
    maxHtmlLength: number
  }
}

export interface SendContactReplyResult {
  id: string
  contactStatus: ContactStatusFilter
  contactedBy: string
}
