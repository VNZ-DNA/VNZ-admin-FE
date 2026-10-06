import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'
import type { UpdateJobPostRequest } from '@/features/careers/types'

export function useUpdateJobPost(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateJobPostRequest) => jobPostService.updateJobPost(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['job-post', id] }),
      ])
    },
  })
}
