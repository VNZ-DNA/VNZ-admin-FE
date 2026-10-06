import { useMutation, useQueryClient } from '@tanstack/react-query'

import { contactService } from '@/features/contacts/services/contact.service'

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contactService.deleteContact(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['contacts', 'detail', id] }),
      ])
    },
  })
}
