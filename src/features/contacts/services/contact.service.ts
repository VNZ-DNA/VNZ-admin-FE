import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type {
  ContactDetail,
  DeleteContactResult,
  ContactPagedResult,
  ContactReplyTemplate,
  GetContactsParams,
  SendContactReplyRequest,
  SendContactReplyResult,
} from '@/features/contacts/types'

import { parseContactReplyTemplate } from '@/features/contacts/schemas/contact-reply-template.schema'
import { createContactListQueryParams } from '@/features/contacts/utils/contact-list-query'

function normalizeReplyPayload(payload: SendContactReplyRequest): SendContactReplyRequest {
  const proposalHtml = payload.proposalHtml?.trim()
  const nextStepsHtml = payload.nextStepsHtml?.trim()

  return {
    subject: payload.subject.trim(),
    body: payload.body.trim(),
    ...(proposalHtml ? { proposalHtml } : {}),
    ...(nextStepsHtml ? { nextStepsHtml } : {}),
  }
}

export const contactService = {
  async getContacts(params: GetContactsParams): Promise<ContactPagedResult> {
    const response = await api.get<ApiResponse<ContactPagedResult>>('/api/v1/admin/contacts', {
      params: createContactListQueryParams(params),
    })

    return getApiResponseData(response.data)
  },

  async getContact(id: string): Promise<ContactDetail> {
    const response = await api.get<ApiResponse<ContactDetail>>(`/api/v1/admin/contacts/${id}`)

    return getApiResponseData(response.data)
  },

  async deleteContact(id: string): Promise<DeleteContactResult> {
    const response = await api.delete<ApiResponse<DeleteContactResult>>(
      `/api/v1/admin/contacts/${id}`,
    )

    return getApiResponseData(response.data)
  },

  async getReplyTemplate(): Promise<ContactReplyTemplate> {
    const response = await api.get<ApiResponse<ContactReplyTemplate>>('/api/v1/admin/contacts/reply/template')

    return parseContactReplyTemplate(getApiResponseData(response.data))
  },

  async sendReply(id: string, payload: SendContactReplyRequest): Promise<SendContactReplyResult> {
    const response = await api.post<ApiResponse<SendContactReplyResult>>(
      `/api/v1/admin/contacts/${id}/reply`,
      normalizeReplyPayload(payload),
    )

    return getApiResponseData(response.data)
  },

}
