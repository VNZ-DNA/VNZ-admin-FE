import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { contactService } from '@/features/contacts/services/contact.service'
import type { SendContactReplyRequest } from '@/features/contacts/types'
import type { ApiResponse } from '@/lib/http/api-response'

function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) return null

  return error.response?.data?.errors?.code ?? null
}

export function useSendContactReply(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendContactReplyRequest) => contactService.sendReply(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts', 'detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] }),
      ])
    },
    onError: async (error) => {
      if (getApiErrorCode(error) !== 'CONTACT_ALREADY_CONTACTED') return

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts', 'detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] }),
      ])
    },
  })
}