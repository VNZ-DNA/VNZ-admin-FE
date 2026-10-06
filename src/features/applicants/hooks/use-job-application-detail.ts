import { useQuery } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'

export function useJobApplicationDetail(id: string) {
  return useQuery({
    queryKey: ['job-application', id],
    queryFn: () => jobApplicationService.getJobApplication(id),
    enabled: Boolean(id),
  })
}
