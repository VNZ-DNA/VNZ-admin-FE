import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { jobApplicationService } from '@/features/applicants/services/job-application.service'
import type { JobApplicationListParams } from '@/features/applicants/types'

export function useJobApplications(params: JobApplicationListParams) {
  return useQuery({
    queryKey: ['job-applications', params],
    queryFn: () => jobApplicationService.getJobApplications(params),
    placeholderData: keepPreviousData,
  })
}
