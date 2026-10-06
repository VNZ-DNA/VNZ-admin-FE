import type { JobApplicationListItem } from '@/features/applicants/types'

export const INTERVIEW_INVITATION_LOCATION_STATE_KEY = 'interviewInvitationApplicants'

type InterviewInvitationLocationState = {
  [INTERVIEW_INVITATION_LOCATION_STATE_KEY]: JobApplicationListItem[]
}

export function createInterviewInvitationLocationState(
  applicants: JobApplicationListItem[],
): InterviewInvitationLocationState {
  return { [INTERVIEW_INVITATION_LOCATION_STATE_KEY]: applicants }
}

export function readInterviewInvitationApplicants(state: unknown): JobApplicationListItem[] {
  if (!state || typeof state !== 'object') return []

  const applicants = (state as Record<string, unknown>)[INTERVIEW_INVITATION_LOCATION_STATE_KEY]
  if (!Array.isArray(applicants)) return []

  return applicants.filter(
    (applicant): applicant is JobApplicationListItem =>
      Boolean(applicant) &&
      typeof applicant === 'object' &&
      typeof (applicant as JobApplicationListItem).id === 'string' &&
      typeof (applicant as JobApplicationListItem).fullName === 'string' &&
      typeof (applicant as JobApplicationListItem).email === 'string' &&
      typeof (applicant as JobApplicationListItem).jobPostTitle === 'string' &&
      typeof (applicant as JobApplicationListItem).status === 'string',
  )
}
