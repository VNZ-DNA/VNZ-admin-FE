import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'

export function useDeleteJobApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => jobApplicationService.deleteJobApplication(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['job-application', id] }),
      ])
    },
  })
}
