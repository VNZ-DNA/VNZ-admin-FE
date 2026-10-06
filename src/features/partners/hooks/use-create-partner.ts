import { useMutation, useQueryClient } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'
import type { CreatePartnerRequest } from '@/features/partners/types'

export function useCreatePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePartnerRequest) => partnerService.createPartner(payload),
    onSuccess: async (partner) => {
      queryClient.setQueryData(['partner', partner.id], partner)
      await queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}