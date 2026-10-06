import { useMutation, useQueryClient } from '@tanstack/react-query'

import { teamMemberService } from '@/features/members/services/team-member.service'

export function useCreateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: teamMemberService.createTeamMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}
