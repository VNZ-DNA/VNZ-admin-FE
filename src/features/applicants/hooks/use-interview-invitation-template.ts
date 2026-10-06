import { useQuery } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'

export function useInterviewInvitationTemplate() {
  return useQuery({
    queryKey: ['interview-invitation-template'],
    queryFn: () => jobApplicationService.getInterviewInvitationTemplate(),
    staleTime: Infinity,
  })
}
