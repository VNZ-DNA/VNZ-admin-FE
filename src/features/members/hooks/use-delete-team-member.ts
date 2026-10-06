import { useMutation, useQueryClient } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'

export function useDeleteTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => teamMemberService.deleteTeamMember(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['team-members'] }),
        queryClient.invalidateQueries({ queryKey: ['team-member', id] }),
      ])
    },
  })
}
