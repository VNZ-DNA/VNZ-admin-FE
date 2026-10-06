import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'
import type { GetPartnersParams } from '@/features/partners/types'

export function usePartners(params: GetPartnersParams) {
  return useQuery({
    queryKey: ['partners', 'table', params],
    queryFn: () => partnerService.getPartners(params),
    placeholderData: keepPreviousData,
  })
}