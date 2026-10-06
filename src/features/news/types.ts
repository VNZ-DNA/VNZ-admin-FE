export type NewsStatusFilter = 'Draft' | 'Published' | 'Closed'

export interface NewsCategoryOption {
  id: string
  name: string
}

export interface NewsArticleListItem {
  id: string
  title: string
  authorName: string
  createdAt: string
  publishAt: string | null
  status: string
  categories: NewsCategoryOption[]
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface PagedNewsArticleList {
  items: NewsArticleListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface GetNewsArticlesParams {
  search?: string
  status?: NewsStatusFilter[]
  categoryIds?: string[]
  page: number
  pageSize: number
}

export type NewsArticleAction = 'Edit' | 'Publish' | 'Close'

export interface NewsArticleDetail {
  id: string
  title: string | null
  summary: string | null
  content: string | null
  imageUrl: string | null
  authorName: string
  createdAt: string
  updatedAt: string | null
  updatedAtUtc: string | null
  publishAt: string | null
  status: string
  categories: NewsCategoryOption[]
  translations: NewsTranslations | null
  actions: NewsArticleAction[]
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface NewsEnglishTranslation {
  title?: string | null
  summary?: string | null
  content?: string | null
}

export interface NewsTranslations {
  en?: NewsEnglishTranslation | null
}

export type NewsCreateStatus = 'Draft' | 'Published'

export interface CreateNewsArticleRequest {
  title: string | null
  summary: string | null
  content: string | null
  categoryIds: string[]
  status: NewsCreateStatus
  translations?: NewsTranslations | null
  image?: File | null
}

export interface NewsContentImageUploadResult {
  url: string
  publicId: string
  format: string
  bytes: number
  width: number
  height: number
}

export interface CreateNewsArticleResult {
  id: string
  title: string | null
  summary: string | null
  content: string | null
  imageUrl: string | null
  authorName: string
  createdAt: string
  updatedAt: string | null
  updatedAtUtc: string | null
  publishAt: string | null
  status: string
  categories: NewsCategoryOption[]
  translations: NewsTranslations | null
}

export type NewsUpdateStatus = 'Draft' | 'Published' | 'Closed'

export interface UpdateNewsArticleContentRequest {
  title: string | null
  summary: string | null
  content: string | null
  categoryIds: string[]
  status: Exclude<NewsUpdateStatus, 'Closed'>
  translations?: NewsTranslations | null
  image?: File | null
  action?: 'removeImage'
  expectedUpdatedAt?: string | null
}

export interface CloseNewsArticleRequest {
  status: 'Closed'
  expectedUpdatedAt?: string | null
}

export type UpdateNewsArticleRequest = UpdateNewsArticleContentRequest | CloseNewsArticleRequest

export interface UpdateNewsArticleResult {
  id: string
  title: string
  summary: string | null
  content: string | null
  imageUrl: string | null
  authorName: string
  createdAt: string
  updatedAt: string | null
  publishAt: string | null
  status: string
  categories: NewsCategoryOption[]
}

export interface DeleteNewsArticleResult {
  id: string
}
