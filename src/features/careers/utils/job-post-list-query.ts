import type { DateSortDirection } from '@/lib/date-sort'

export interface JobPostListQueryParams {
  expiredDate?: DateSortDirection
  search?: string
  status?: readonly string[]
  departmentId?: readonly string[]
  jobLevel?: readonly string[]
  page: number
  pageSize: number
}

function appendDistinctValues(query: URLSearchParams, key: string, values: readonly string[] = []) {
  const distinctValues = new Set(values.map((value) => value.trim()).filter(Boolean))

  for (const value of distinctValues) {
    query.append(key, value)
  }
}

export function buildJobPostListQuery(params: JobPostListQueryParams): URLSearchParams {
  const query = new URLSearchParams()
  const search = params.search?.trim()

  if (search) query.set('search', search)
  if (params.expiredDate) query.set('expiredDate', params.expiredDate)
  appendDistinctValues(query, 'status', params.status)
  appendDistinctValues(query, 'departmentId', params.departmentId)
  appendDistinctValues(query, 'jobLevel', params.jobLevel)
  query.set('page', String(params.page))
  query.set('pageSize', String(params.pageSize))

  return query
}
