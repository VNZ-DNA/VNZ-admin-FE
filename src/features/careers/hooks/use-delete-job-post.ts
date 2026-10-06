import { useMutation, useQueryClient } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'

export function useDeleteJobPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => jobPostService.deleteJobPost(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['job-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['job-post', id] }),
      ])
    },
  })
}
