import { useQuery } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'

export function useTeamMemberDetail(id: string) {
  return useQuery({
    queryKey: ['team-member', id],
    queryFn: () => teamMemberService.getTeamMember(id),
    enabled: Boolean(id),
  })
}
