export type ProductStatus = 'InProgress' | 'Completed'
export type ProductContentBlockType = 'Title' | 'Description' | 'Category' | 'Feature'
export type ProductImageAction = 'remove'

export interface ProductFeatureItem {
  id: string
  title: string
}

export interface ProductContentBlock {
  id: string
  type: ProductContentBlockType
  order: number
  text: string | null
  items: ProductFeatureItem[] | null
}

export interface ProductContent {
  blocks: ProductContentBlock[]
}

export interface ProductEnglishTranslation {
  content?: ProductContent | null
}

export interface ProductTranslations {
  en?: ProductEnglishTranslation | null
}

export interface ProductMediaMutation {
  logo?: File
  wordmark?: File
  logoAction?: ProductImageAction
  wordmarkAction?: ProductImageAction
}

export interface ProductListItem {
  id: string
  name: string
  logoUrl: string | null
  productUrl: string | null
  summary: string | null
  status: ProductStatus
  isPublished: boolean
  displayOrder: number | null
  createdAt: string
  updatedAt: string | null
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface PagedProductList {
  items: ProductListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface GetProductsParams {
  search?: string
  status?: ProductStatus[]
  isPublished?: boolean
  page: number
  pageSize: number
}

export interface OrderableProduct {
  id: string
  name: string
  logoUrl: string | null
  displayOrder: number
}

export interface ReorderProductsRequest {
  orderedProductIds: string[]
}

export interface ProductDetail {
  id: string
  name: string
  logoUrl: string | null
  wordmarkUrl: string | null
  productUrl: string | null
  content: ProductContent | null
  status: ProductStatus
  isPublished: boolean
  displayOrder: number | null
  createdBy: string | null
  createdAt: string
  updatedAt: string | null
  translations: ProductTranslations | null
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface DeleteProductResult {
  id: string
}

export interface UpdateProductFormRequest extends ProductMediaMutation {
  name: string
  productUrl: string | null
  content: ProductContent | null
  status: ProductStatus
  translations?: ProductTranslations | null
  expectedUpdatedAt?: string | null
  isPublished?: boolean
}

export type PublishProductRequest = Omit<UpdateProductFormRequest, 'isPublished'> & {
  isPublished: true
}

export interface UnpublishProductRequest {
  isPublished: false
  expectedUpdatedAt?: string | null
}

export type UpdateProductRequest =
  | UpdateProductFormRequest
  | PublishProductRequest
  | UnpublishProductRequest

export interface CreateProductRequest {
  name: string
  productUrl: string | null
  content: ProductContent | null
  translations?: ProductTranslations | null
  logo?: File
  wordmark?: File
}
