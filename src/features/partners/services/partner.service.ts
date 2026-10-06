import type {
  CreatePartnerRequest,
  DeletePartnerResult,
  GetPartnersParams,
  OrderablePartner,
  PagedPartnerList,
  PartnerDetail,
  PartnerListItem,
  ReorderPartnersRequest,
  UpdatePartnerRequest,
} from '@/features/partners/types'
import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

function appendNullable(formData: FormData, key: string, value: string | null) {
  formData.append(key, value ?? '')
}

function buildCreateFormData(payload: CreatePartnerRequest): FormData {
  const formData = new FormData()

  formData.append('name', payload.name)
  appendNullable(formData, 'websiteUrl', payload.websiteUrl)
  appendNullable(formData, 'description', payload.description)
  if (payload.logo) formData.append('logo', payload.logo)

  return formData
}

function buildUpdateFormData(payload: UpdatePartnerRequest): FormData {
  const formData = new FormData()

  if ('isPublished' in payload) {
    formData.append('isPublished', String(payload.isPublished))
    return formData
  }

  formData.append('name', payload.name)
  appendNullable(formData, 'logoUrl', payload.logoUrl)
  appendNullable(formData, 'websiteUrl', payload.websiteUrl)
  appendNullable(formData, 'description', payload.description)
  if (payload.logo) formData.append('logo', payload.logo)

  return formData
}

export const partnerService = {
  async createPartner(payload: CreatePartnerRequest): Promise<PartnerDetail> {
    const response = await api.post<ApiResponse<PartnerDetail>>(
      '/api/v1/admin/partners',
      buildCreateFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async getPartners(params: GetPartnersParams): Promise<PagedPartnerList> {
    const trimmedSearch = params.search?.trim()
    const response = await api.get<ApiResponse<PagedPartnerList>>('/api/v1/admin/partners', {
      params: {
        ...(trimmedSearch ? { search: trimmedSearch } : {}),
        page: params.page,
        pageSize: params.pageSize,
      },
    })

    return getApiResponseData(response.data)
  },

  async getOrderablePartners(): Promise<OrderablePartner[]> {
    const response = await api.get<ApiResponse<PartnerListItem[]>>(
      '/api/v1/admin/partners/display-order',
    )

    return getApiResponseData(response.data).map((partner) => {
      if (partner.displayOrder === null) {
        throw new Error('Partner đã đăng không có displayOrder.')
      }

      return {
        id: partner.id,
        name: partner.name,
        logoUrl: partner.logoUrl,
        displayOrder: partner.displayOrder,
      }
    })
  },

  async reorderPartners(payload: ReorderPartnersRequest): Promise<OrderablePartner[]> {
    const response = await api.put<ApiResponse<PartnerListItem[]>>(
      '/api/v1/admin/partners/display-order',
      payload,
    )

    return getApiResponseData(response.data).map((partner) => {
      if (partner.displayOrder === null) {
        throw new Error('Partner đã đăng không có displayOrder.')
      }

      return {
        id: partner.id,
        name: partner.name,
        logoUrl: partner.logoUrl,
        displayOrder: partner.displayOrder,
      }
    })
  },

  async getPartner(id: string): Promise<PartnerDetail> {
    const response = await api.get<ApiResponse<PartnerDetail>>(`/api/v1/admin/partners/${id}`)

    return getApiResponseData(response.data)
  },

  async updatePartner(id: string, payload: UpdatePartnerRequest): Promise<PartnerDetail> {
    const response = await api.put<ApiResponse<PartnerDetail>>(
      `/api/v1/admin/partners/${id}`,
      buildUpdateFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async deletePartner(id: string): Promise<DeletePartnerResult> {
    const response = await api.delete<ApiResponse<DeletePartnerResult>>(`/api/v1/admin/partners/${id}`)

    return getApiResponseData(response.data)
  },
}
