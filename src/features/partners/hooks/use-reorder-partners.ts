import { useMutation, useQueryClient } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'
import type { ReorderPartnersRequest } from '@/features/partners/types'

export function useReorderPartners() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReorderPartnersRequest) => partnerService.reorderPartners(payload),
    onSuccess: async (partners) => {
      queryClient.setQueryData(['partners', 'display-order'], partners)
      await queryClient.invalidateQueries({ queryKey: ['partners', 'table'] })
    },
  })
}