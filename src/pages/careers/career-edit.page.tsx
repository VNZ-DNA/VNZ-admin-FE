import { Navigate, useParams } from 'react-router-dom'

import { EditJobPostForm } from '@/features/careers/components/edit-job-post-form'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function CareerEditPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to={ROUTE_PATHS.CAREERS} replace />
  }

  return <EditJobPostForm id={id} />
}
