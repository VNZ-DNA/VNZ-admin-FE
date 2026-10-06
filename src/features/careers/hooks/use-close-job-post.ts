import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'

export function useCloseJobPost(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => jobPostService.closeJobPost(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['job-post', id] }),
      ])
    },
  })
}
