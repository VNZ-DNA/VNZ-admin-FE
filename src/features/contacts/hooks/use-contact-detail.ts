import { useQuery } from '@tanstack/react-query'

import { contactService } from '@/features/contacts/services/contact.service'

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ['contacts', 'detail', id],
    queryFn: () => contactService.getContact(id),
    enabled: Boolean(id),
  })
}
