import { Navigate, useParams } from 'react-router-dom'

import { JobPostDetail } from '@/features/careers/components/job-post-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function CareerDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to={ROUTE_PATHS.CAREERS} replace />
  }

  return <JobPostDetail id={id} />
}
