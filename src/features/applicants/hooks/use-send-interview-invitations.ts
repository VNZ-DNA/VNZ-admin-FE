import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'
import type { SendInterviewInvitationsRequest } from '@/features/applicants/types'

export function useSendInterviewInvitations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendInterviewInvitationsRequest) =>
      jobApplicationService.sendInterviewInvitations(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['job-application'] }),
      ])
    },
  })
}