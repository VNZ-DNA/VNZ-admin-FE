import { useMutation, useQueryClient } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'

export function useDeletePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => partnerService.deletePartner(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['partner', id] }),
        queryClient.invalidateQueries({ queryKey: ['partners', 'display-order'] }),
      ])
    },
  })
}
