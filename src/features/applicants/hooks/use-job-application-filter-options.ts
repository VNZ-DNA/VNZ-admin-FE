import { useQuery } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'

export function useJobApplicationFilterOptions() {
  return useQuery({
    queryKey: ['job-application-filter-options'],
    queryFn: () => jobApplicationService.getJobApplicationFilterOptions(),
  })
}
