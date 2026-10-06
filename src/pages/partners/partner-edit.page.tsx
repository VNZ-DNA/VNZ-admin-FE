import { Navigate, useParams } from 'react-router-dom'

import { EditPartnerForm } from '@/features/partners/components/edit-partner-form'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function PartnerEditPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.PARTNERS} replace />

  return <EditPartnerForm id={id} />
}