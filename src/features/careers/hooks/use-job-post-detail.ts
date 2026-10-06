import { useQuery } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'

export function useJobPostDetail(id: string) {
  return useQuery({
    queryKey: ['job-post', id],
    queryFn: () => jobPostService.getJobPost(id),
    enabled: Boolean(id),
  })
}
