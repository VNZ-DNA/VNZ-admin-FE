import { useMutation, useQueryClient } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'
import type { UpdateTeamMemberRequest } from '@/features/members/types'

export function useUpdateTeamMember(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateTeamMemberRequest) => teamMemberService.updateTeamMember(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-members'] })
      void queryClient.invalidateQueries({ queryKey: ['team-member', id] })
    },
  })
}
