import { useMutation, useQueryClient } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'
import type { ReorderTeamMembersRequest } from '@/features/members/types'

export function useReorderTeamMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReorderTeamMembersRequest) => teamMemberService.reorderTeamMembers(payload),
    onSuccess: async (members) => {
      queryClient.setQueryData(['team-members', 'display-order'], members)
      await queryClient.invalidateQueries({ queryKey: ['team-members', 'table'] })
    },
  })
}
