import { useQuery } from '@tanstack/react-query'

import { contactService } from '@/features/contacts/services/contact.service'

export function useContactReplyTemplate() {
  return useQuery({
    queryKey: ['contact-reply-template'],
    queryFn: contactService.getReplyTemplate,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
