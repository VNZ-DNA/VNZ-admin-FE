import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type {
  CreateNewsArticleRequest,
  CreateNewsArticleResult,
  DeleteNewsArticleResult,
  GetNewsArticlesParams,
  NewsArticleDetail,
  NewsCategoryOption,
  NewsContentImageUploadResult,
  PagedNewsArticleList,
  UpdateNewsArticleRequest,
  UpdateNewsArticleResult,
} from '@/features/news/types'

function buildNewsFormData(payload: CreateNewsArticleRequest | UpdateNewsArticleRequest): FormData {
  const formData = new FormData()

  formData.append('status', payload.status)

  if ('expectedUpdatedAt' in payload && payload.expectedUpdatedAt) {
    formData.append('expectedUpdatedAt', payload.expectedUpdatedAt)
  }

  if (payload.status === 'Closed') return formData

  if (payload.title !== null) formData.append('title', payload.title)
  if (payload.summary !== null) formData.append('summary', payload.summary)
  if (payload.content !== null) formData.append('content', payload.content)

  for (const categoryId of payload.categoryIds) {
    formData.append('categoryIds', categoryId)
  }

  if (payload.image) {
    formData.append('image', payload.image)
  }

  if ('action' in payload && payload.action) {
    formData.append('action', payload.action)
  }

  if ('translations' in payload) {
    const english = payload.translations?.en
    if (english?.title != null) formData.append('translations.en.title', english.title)
    if (english?.summary != null) formData.append('translations.en.summary', english.summary)
    if (english?.content != null) formData.append('translations.en.content', english.content)
  }

  return formData
}

export const newsService = {
  async getNewsArticles(params: GetNewsArticlesParams): Promise<PagedNewsArticleList> {
    const trimmedSearch = params.search?.trim()
    const query = new URLSearchParams()

    if (trimmedSearch) query.set('search', trimmedSearch)
    if (params.createdAt) query.set('createdAt', params.createdAt)
    if (params.publishAt) query.set('publishAt', params.publishAt)
    for (const status of params.status ?? []) query.append('status', status)
    for (const categoryId of params.categoryIds ?? []) query.append('categoryId', categoryId)
    query.set('page', String(params.page))
    query.set('pageSize', String(params.pageSize))

    const response = await api.get<ApiResponse<PagedNewsArticleList>>('/api/v1/admin/news', {
      params: query,
    })

    return getApiResponseData(response.data)
  },

  async getNewsCategories(): Promise<NewsCategoryOption[]> {
    const response = await api.get<ApiResponse<NewsCategoryOption[]>>('/api/v1/admin/news/categories')

    return getApiResponseData(response.data)
  },

  async getNewsArticleDetail(id: string): Promise<NewsArticleDetail> {
    const response = await api.get<ApiResponse<NewsArticleDetail>>(`/api/v1/admin/news/${id}`)

    return getApiResponseData(response.data)
  },

  async createNewsArticle(payload: CreateNewsArticleRequest): Promise<CreateNewsArticleResult> {
    const response = await api.post<ApiResponse<CreateNewsArticleResult>>(
      '/api/v1/admin/news',
      buildNewsFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async updateNewsArticle(id: string, payload: UpdateNewsArticleRequest): Promise<UpdateNewsArticleResult> {
    const response = await api.put<ApiResponse<UpdateNewsArticleResult>>(
      `/api/v1/admin/news/${id}`,
      buildNewsFormData(payload),
    )

    return getApiResponseData(response.data)
  },

  async deleteNewsArticle(id: string): Promise<DeleteNewsArticleResult> {
    const response = await api.delete<ApiResponse<DeleteNewsArticleResult>>(`/api/v1/admin/news/${id}`)

    return getApiResponseData(response.data)
  },

  async uploadContentImage(file: File): Promise<NewsContentImageUploadResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<ApiResponse<NewsContentImageUploadResult>>(
      '/api/v1/admin/news/content-images',
      formData,
    )

    return getApiResponseData(response.data)
  },
}
