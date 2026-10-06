import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'
import type { GetJobPostsParams } from '@/features/careers/types'

export function useJobPosts(params: GetJobPostsParams) {
  return useQuery({
    queryKey: ['job-posts', params],
    queryFn: () => jobPostService.getJobPosts(params),
    placeholderData: keepPreviousData,
  })
}
