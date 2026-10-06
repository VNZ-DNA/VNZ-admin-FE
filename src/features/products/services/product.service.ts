import { sanitizeProductRichText } from '@/features/products/product-rich-text'
import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type {
  CreateProductRequest,
  DeleteProductResult,
  GetProductsParams,
  OrderableProduct,
  PagedProductList,
  ProductDetail,
  ReorderProductsRequest,
  UpdateProductRequest,
} from '@/features/products/types'

function appendProductContent(
  formData: FormData,
  content: CreateProductRequest['content'],
  root = 'content',
) {
  if (!content) return

  content.blocks.forEach((block, blockIndex) => {
    const prefix = `${root}.blocks[${blockIndex}]`
    formData.append(`${prefix}.id`, block.id)
    formData.append(`${prefix}.type`, block.type)
    formData.append(`${prefix}.order`, String(block.order))

    if (block.type === 'Feature') {
      ;(block.items ?? []).forEach((item, itemIndex) => {
        const itemPrefix = `${prefix}.items[${itemIndex}]`
        formData.append(`${itemPrefix}.id`, item.id)
        formData.append(`${itemPrefix}.title`, item.title)
      })
      return
    }

    if (block.text !== null) {
      formData.append(`${prefix}.text`, sanitizeProductRichText(block.text))
    }
  })
}

function appendProductMedia(
  formData: FormData,
  payload: Pick<
    Extract<UpdateProductRequest, { name: string }>,
    'logo' | 'wordmark' | 'logoAction' | 'wordmarkAction'
  > | CreateProductRequest,
) {
  if (payload.logo) formData.append('logo', payload.logo)
  if (payload.wordmark) formData.append('wordmark', payload.wordmark)
  if ('logoAction' in payload && payload.logoAction) {
    formData.append('logoAction', payload.logoAction)
  }
  if ('wordmarkAction' in payload && payload.wordmarkAction) {
    formData.append('wordmarkAction', payload.wordmarkAction)
  }
}

function buildCreateFormData(payload: CreateProductRequest) {
  const formData = new FormData()
  formData.append('name', payload.name)
  if (payload.productUrl) formData.append('productUrl', payload.productUrl)
  appendProductContent(formData, payload.content)
  appendProductContent(formData, payload.translations?.en?.content ?? null, 'translations.en.content')
  appendProductMedia(formData, payload)
  return formData
}

function buildUpdateFormData(payload: UpdateProductRequest) {
  const formData = new FormData()

  if (!('name' in payload)) {
    formData.append('isPublished', String(payload.isPublished))
    if (payload.expectedUpdatedAt) formData.append('expectedUpdatedAt', payload.expectedUpdatedAt)
    return formData
  }

  formData.append('name', payload.name)
  formData.append('status', payload.status)
  if (payload.isPublished !== undefined) formData.append('isPublished', String(payload.isPublished))
  if (payload.expectedUpdatedAt) formData.append('expectedUpdatedAt', payload.expectedUpdatedAt)
  if (payload.productUrl) formData.append('productUrl', payload.productUrl)
  appendProductContent(formData, payload.content)
  appendProductContent(formData, payload.translations?.en?.content ?? null, 'translations.en.content')
  appendProductMedia(formData, payload)
  return formData
}

export const productService = {
  async createProduct(payload: CreateProductRequest): Promise<ProductDetail> {
    const response = await api.post<ApiResponse<ProductDetail>>(
      '/api/v1/admin/products',
      buildCreateFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async getProducts(params: GetProductsParams): Promise<PagedProductList> {
    const trimmedSearch = params.search?.trim()
    const query = new URLSearchParams()

    if (trimmedSearch) query.set('search', trimmedSearch)
    for (const status of params.status ?? []) query.append('status', status)
    if (params.isPublished !== undefined) query.set('isPublished', String(params.isPublished))
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))

    const response = await api.get<ApiResponse<PagedProductList>>('/api/v1/admin/products', {
      params: query,
    })

    return getApiResponseData(response.data)
  },

  async getOrderableProducts(): Promise<OrderableProduct[]> {
    const response = await api.get<ApiResponse<OrderableProduct[]>>(
      '/api/v1/admin/products/display-order',
    )

    return getApiResponseData(response.data)
  },

  async reorderProducts(payload: ReorderProductsRequest): Promise<OrderableProduct[]> {
    const response = await api.put<ApiResponse<OrderableProduct[]>>(
      '/api/v1/admin/products/display-order',
      payload,
    )

    return getApiResponseData(response.data)
  },

  async getProduct(id: string): Promise<ProductDetail> {
    const response = await api.get<ApiResponse<ProductDetail>>(`/api/v1/admin/products/${id}`)

    return getApiResponseData(response.data)
  },

  async deleteProduct(id: string): Promise<DeleteProductResult> {
    const response = await api.delete<ApiResponse<DeleteProductResult>>(`/api/v1/admin/products/${id}`)

    return getApiResponseData(response.data)
  },

  async updateProduct(id: string, payload: UpdateProductRequest): Promise<ProductDetail> {
    const response = await api.put<ApiResponse<ProductDetail>>(
      `/api/v1/admin/products/${id}`,
      buildUpdateFormData(payload),
    )

    return getApiResponseData(response.data)
  },
}
