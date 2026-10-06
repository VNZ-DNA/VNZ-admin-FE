export type JobApplicationStatusFilter = 'Pending' | 'Accepted' | 'Rejected' | 'SendedEmail'
export type JobApplicationReviewDecision = 'Accepted' | 'Rejected'

export interface JobApplicationListItem {
  id: string
  fullName: string
  email: string
  jobPostId: string
  jobPostTitle: string
  jobPostSnapshotTitle?: string
  canSelectForInterviewEmail: boolean
  cvUrl: string | null
  status: string
  createdAt: string
}

export interface JobApplicationListParams {
  search?: string
  status?: JobApplicationStatusFilter[]
  jobPostId?: string[]
  page: number
  pageSize: number
}

export interface JobApplicationFilterOptions {
  jobPosts: Array<{ id: string; title: string }>
}

export interface JobApplicationPagedResult {
  items: JobApplicationListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface DeleteJobApplicationResult {
  id: string
}

export interface JobPostSkillsSnapshot {
  skills: string[]
}

export interface JobPostSnapshot {
  departmentId: string
  departmentName: string
  title: string
  employmentType: string
  jobLevel: string
  numberOfPositions: number
  shortDescription: string
  description: string
  requirements: string
  expiredAt: string | null
  jobSkillsSnapshot: JobPostSkillsSnapshot | null
}

export interface JobApplicationDetail {
  id: string
  fullName: string
  email: string
  phone: string | null
  university: string | null
  major: string | null
  graduationYear: number | null
  availability: string | null
  availableStartDate: string | null
  referralSource: string | null
  cvUrl: string | null
  portfolioUrl: string | null
  coverLetter: string | null
  status: string
  interViewAt: string | null
  createdAt: string
  jobPostSnapshot: JobPostSnapshot | null
}

export interface ReviewJobApplicationRequest {
  decision: JobApplicationReviewDecision
}

export interface ReviewJobApplicationResponse {
  id: string
  status: string
  reviewedByName?: string | null
  reviewAt?: string | null
  cvUrl: string | null
}

export interface SendInterviewInvitationsRequest {
  applicationIds: string[]
  interviewDate: string
  interviewTime: string
  durationMinutes: number
  interviewMode: 'Onsite' | 'Online'
  location?: string
  locationUrl: string
  interviewInformationHtml?: string
  agendaHtml: string
  preparationHtml: string
}

export interface InterviewInvitationTemplate {
  templateKey: 'interview-invitation'
  branding: {
    logoUrl: string
    primaryColor: string
    fontFamily: string
    contentMaxWidthPx: number
  }
  fixedCopy: {
    subject: string
    greeting: string
    opening: string
    interviewInformationHeading: string
    agendaHeading: string
    preparationHeading: string
    confirmationCopy: string
    closing: string
    signature: string
  }
  blocks: InterviewInvitationTemplateBlock[]
  deadlinePolicy: {
    timezone: 'Asia/Ho_Chi_Minh'
    daysBeforeInterview: number
    time: string
    displayFormat: string
  }
  richTextPolicy: {
    allowedTags: string[]
    allowedLinkProtocols: string[]
    maxHtmlLength: number
  }
}

export type InterviewInvitationTemplateBlock =
  | { key: string; type: 'logo' }
  | {
      key: string
      type: 'text'
      fixedCopyKey?: keyof InterviewInvitationTemplate['fixedCopy']
      value?: string
    }
  | { key: string; type: 'interview-info' }
  | { key: 'interviewInformationHtml' | 'agendaHtml' | 'preparationHtml'; type: 'rich-text'; heading?: string; required: boolean }

export type InterviewInvitationOutcome = 'Sent' | 'MailFailed'

export interface InterviewInvitationItemResult {
  applicationId: string
  outcome: InterviewInvitationOutcome
  status: string
  interviewAt: string | null
}

export interface SendInterviewInvitationsResult {
  interviewAt: string
  totalRequested: number
  sentCount: number
  failedCount: number
  results: InterviewInvitationItemResult[]
}
