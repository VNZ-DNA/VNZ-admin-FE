import { useQuery } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'

export function useOrderableTeamMembers(enabled = true) {
  return useQuery({
    queryKey: ['team-members', 'display-order'],
    queryFn: teamMemberService.getOrderableTeamMembers,
    enabled,
  })
}
