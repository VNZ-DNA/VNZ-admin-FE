import { Navigate, useParams } from 'react-router-dom'

import { PartnerDetail } from '@/features/partners/components/partner-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.PARTNERS} replace />

  return <PartnerDetail id={id} />
}