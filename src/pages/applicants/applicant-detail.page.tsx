import { Navigate, useParams } from 'react-router-dom'

import { ApplicantDetail } from '@/features/applicants/components/applicant-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.APPLICANTS} replace />

  return <ApplicantDetail id={id} />
}
