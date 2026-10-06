import { useQuery } from '@tanstack/react-query'

import { partnerService } from '@/features/partners/services/partner.service'

export function usePartnerDetail(id: string) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnerService.getPartner(id),
    enabled: Boolean(id),
  })
}