import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type {
  CreateTeamMemberRequest,
  DeleteTeamMemberResult,
  GetTeamMembersParams,
  OrderableTeamMember,
  ReorderTeamMembersRequest,
  TeamMemberDetail,
  TeamMemberFilterOptions,
  TeamMemberListItem,
  TeamMemberPagedResult,
  UpdateTeamMemberRequest,
} from '@/features/members/types'

function appendNullable(formData: FormData, key: string, value: string | null) {
  formData.append(key, value ?? '')
}

function buildCreateFormData(payload: CreateTeamMemberRequest): FormData {
  const formData = new FormData()
  formData.append('fullName', payload.fullName)
  appendNullable(formData, 'displayName', payload.displayName)
  formData.append('email', payload.email)
  formData.append('position', payload.position)
  formData.append('jobLevel', payload.jobLevel)
  formData.append('joinedDate', payload.joinedDate)
  appendNullable(formData, 'avatarUrl', payload.avatarUrl)
  appendNullable(formData, 'animationUrl', payload.animationUrl)
  appendNullable(formData, 'audioUrl', payload.audioUrl)
  appendNullable(formData, 'hometown', payload.hometown)
  appendNullable(formData, 'backgroundUrl', payload.backgroundUrl)
  appendNullable(formData, 'hobbies', payload.hobbies)
  appendNullable(formData, 'personalQuote', payload.personalQuote)
  return formData
}

function buildUpdateFormData(payload: UpdateTeamMemberRequest): FormData {
  const formData = new FormData()

  if ('isPublished' in payload) {
    formData.append('isPublished', String(payload.isPublished))
    return formData
  }

  formData.append('fullName', payload.fullName)
  appendNullable(formData, 'displayName', payload.displayName)
  formData.append('email', payload.email)
  formData.append('position', payload.position)
  formData.append('jobLevel', payload.jobLevel)
  formData.append('joinedDate', payload.joinedDate)
  appendNullable(formData, 'avatarUrl', payload.avatarUrl)
  appendNullable(formData, 'animationUrl', payload.animationUrl)
  appendNullable(formData, 'audioUrl', payload.audioUrl)
  appendNullable(formData, 'hometown', payload.hometown)
  appendNullable(formData, 'backgroundUrl', payload.backgroundUrl)
  appendNullable(formData, 'hobbies', payload.hobbies)
  appendNullable(formData, 'personalQuote', payload.personalQuote)
  formData.append('employmentStatus', payload.employmentStatus)

  return formData
}

export const teamMemberService = {
  async getTeamMembers(params: GetTeamMembersParams): Promise<TeamMemberPagedResult> {
    const queryParams = new URLSearchParams()

    if (params.search) queryParams.set('search', params.search)
    for (const status of params.status ?? []) queryParams.append('status', status)
    for (const position of params.position ?? []) queryParams.append('position', position)
    for (const jobLevel of params.jobLevel ?? []) queryParams.append('jobLevel', jobLevel)
    if (params.page !== undefined) queryParams.set('page', String(params.page))
    if (params.pageSize !== undefined) queryParams.set('pageSize', String(params.pageSize))

    const response = await api.get<ApiResponse<TeamMemberPagedResult>>('/api/v1/admin/team-members', {
      params: queryParams,
    })

    return getApiResponseData(response.data)
  },

  async getTeamMemberFilterOptions(): Promise<TeamMemberFilterOptions> {
    const response = await api.get<ApiResponse<TeamMemberFilterOptions>>(
      '/api/v1/admin/team-members/filter-options',
    )

    return getApiResponseData(response.data)
  },

  async getOrderableTeamMembers(): Promise<OrderableTeamMember[]> {
    const response = await api.get<ApiResponse<OrderableTeamMember[]>>(
      '/api/v1/admin/team-members/display-order',
    )

    return getApiResponseData(response.data)
  },

  async createTeamMember(payload: CreateTeamMemberRequest): Promise<TeamMemberListItem> {
    const response = await api.post<ApiResponse<TeamMemberListItem>>(
      '/api/v1/admin/team-members',
      buildCreateFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async getTeamMember(id: string): Promise<TeamMemberDetail> {
    const response = await api.get<ApiResponse<TeamMemberDetail>>(
      `/api/v1/admin/team-members/${id}`,
    )

    return getApiResponseData(response.data)
  },

  async updateTeamMember(id: string, payload: UpdateTeamMemberRequest): Promise<TeamMemberDetail> {
    const response = await api.put<ApiResponse<TeamMemberDetail>>(
      `/api/v1/admin/team-members/${id}`,
      buildUpdateFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async deleteTeamMember(id: string): Promise<DeleteTeamMemberResult> {
    const response = await api.delete<ApiResponse<DeleteTeamMemberResult>>(
      `/api/v1/admin/team-members/${id}`,
    )

    return getApiResponseData(response.data)
  },

  async reorderTeamMembers(payload: ReorderTeamMembersRequest): Promise<OrderableTeamMember[]> {
    const response = await api.put<ApiResponse<OrderableTeamMember[]>>(
      '/api/v1/admin/team-members/display-order',
      payload,
    )

    return getApiResponseData(response.data)
  },
}
