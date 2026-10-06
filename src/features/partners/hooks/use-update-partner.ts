import { useMutation, useQueryClient } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'
import type { UpdatePartnerRequest } from '@/features/partners/types'

export function useUpdatePartner(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePartnerRequest) => partnerService.updatePartner(id, payload),
    onSuccess: async (partner) => {
      queryClient.setQueryData(['partner', id], partner)
      await queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}