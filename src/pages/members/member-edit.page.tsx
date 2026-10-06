import { Navigate, useParams } from 'react-router-dom'

import { EditTeamMemberForm } from '@/features/members/components/edit-team-member-form'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function MemberEditPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.MEMBERS} replace />

  return <EditTeamMemberForm id={id} />
}
