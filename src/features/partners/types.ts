export interface PartnerListItem {
  id: string
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  description: string | null
  isPublished: boolean
  displayOrder: number | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface PagedPartnerList {
  items: PartnerListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface GetPartnersParams {
  search?: string
  page: number
  pageSize: number
}

export interface OrderablePartner {
  id: string
  name: string
  logoUrl: string | null
  displayOrder: number
}

export interface ReorderPartnersRequest {
  orderedPartnerIds: string[]
}

export type PartnerDetail = PartnerListItem

export interface CreatePartnerRequest {
  name: string
  websiteUrl: string | null
  description: string | null
  logo?: File
}

export interface UpdatePartnerProfileRequest {
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  description: string | null
  logo?: File
}

export interface PublishPartnerRequest {
  isPublished: true
}

export interface UnpublishPartnerRequest {
  isPublished: false
}

export type UpdatePartnerRequest =
  | UpdatePartnerProfileRequest
  | PublishPartnerRequest
  | UnpublishPartnerRequest

export interface DeletePartnerResult {
  id: string
}
