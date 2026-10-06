import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'

export function useCreateJobPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: jobPostService.createJobPost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-posts'] })
    },
  })
}
