import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'
import type { ReviewJobApplicationRequest } from '@/features/applicants/types'

export function useReviewJobApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReviewJobApplicationRequest) =>
      jobApplicationService.reviewJobApplication(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['job-application', id] }),
      ])
    },
  })
}
