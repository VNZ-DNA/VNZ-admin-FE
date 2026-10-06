import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'
import type { GetTeamMembersParams } from '@/features/members/types'

export function useTeamMembers(params: GetTeamMembersParams) {
  return useQuery({
    queryKey: ['team-members', 'table', params],
    queryFn: () => teamMemberService.getTeamMembers(params),
    placeholderData: keepPreviousData,
  })
}
