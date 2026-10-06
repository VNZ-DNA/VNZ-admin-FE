import { Navigate, useParams } from 'react-router-dom'

import { TeamMemberDetail } from '@/features/members/components/team-member-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.MEMBERS} replace />

  return <TeamMemberDetail id={id} />
}
