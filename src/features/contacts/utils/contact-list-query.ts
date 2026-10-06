import type { ContactStatusFilter } from '@/features/contacts/types'

export interface ContactListQueryInput {
  search?: string
  status?: readonly ContactStatusFilter[]
  isRead?: readonly boolean[]
  page: number
  pageSize: number
}

export function createContactListQueryParams(input: ContactListQueryInput): URLSearchParams {
  const params = new URLSearchParams()
  const search = input.search?.trim()

  if (search) params.append('search', search)
  input.status?.forEach((status) => params.append('status', status))
  input.isRead?.forEach((isRead) => params.append('isRead', String(isRead)))
  params.append('page', String(input.page))
  params.append('pageSize', String(input.pageSize))

  return params
}
