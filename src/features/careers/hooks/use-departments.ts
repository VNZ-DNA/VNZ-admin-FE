import { useQuery } from '@tanstack/react-query'

import { jobPostService } from '@/features/careers/services/job-post.service'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: jobPostService.getDepartments,
    staleTime: 5 * 60 * 1000,
  })
}
