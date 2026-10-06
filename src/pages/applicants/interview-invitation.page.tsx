import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { InterviewEmailComposer } from '@/features/applicants/components/interview-email-composer'
import { readInterviewInvitationApplicants } from '@/features/applicants/utils/interview-invitation-navigation'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function InterviewInvitationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedApplicants = readInterviewInvitationApplicants(location.state)

  if (selectedApplicants.length === 0) {
    return <Navigate replace to={ROUTE_PATHS.APPLICANTS} />
  }

  return (
    <InterviewEmailComposer
      selectedApplicants={selectedApplicants}
      onCancel={() => navigate(ROUTE_PATHS.APPLICANTS)}
      onBatchInvalid={() => navigate(ROUTE_PATHS.APPLICANTS)}
    />
  )
}
