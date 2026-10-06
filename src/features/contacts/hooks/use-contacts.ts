import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { contactService } from '@/features/contacts/services/contact.service'
import type { GetContactsParams } from '@/features/contacts/types'

export function useContacts(params: GetContactsParams) {
  return useQuery({
    queryKey: ['contacts', 'list', params],
    queryFn: () => contactService.getContacts(params),
    placeholderData: keepPreviousData,
  })
}
