import { useQuery } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'

export function useOrderablePartners(enabled = true) {
  return useQuery({
    queryKey: ['partners', 'display-order'],
    queryFn: partnerService.getOrderablePartners,
    enabled,
  })
}