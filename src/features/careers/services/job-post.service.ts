import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'

import type {
  CloseJobPostRequest,
  CreateJobPostRequest,
  DepartmentOption,
  DeleteJobPostResult,
  GetJobPostsParams,
  JobPostCreatedResponse,
  JobPostDetail,
  PagedJobPostList,
  UpdateJobPostRequest,
} from '@/features/careers/types'
import { buildJobPostListQuery } from '@/features/careers/utils/job-post-list-query'
import { normalizeJobPostListResponse } from '@/features/careers/utils/job-post-list-response'

type JobPostListApiResponse<T> = Omit<ApiResponse<T>, 'isSuccess'> & {
  isSuccess?: boolean
  success?: boolean
}

export const jobPostService = {
  async getJobPosts(params: GetJobPostsParams): Promise<PagedJobPostList> {
    const response = await api.get<JobPostListApiResponse<PagedJobPostList>>('/api/v1/admin/job-posts', {
      params: buildJobPostListQuery(params),
    })

    return getApiResponseData(normalizeJobPostListResponse(response.data) as ApiResponse<PagedJobPostList>)
  },

  async getJobPost(id: string): Promise<JobPostDetail> {
    const response = await api.get<ApiResponse<JobPostDetail>>(`/api/v1/admin/job-posts/${id}`)

    return getApiResponseData(response.data)
  },

  async deleteJobPost(id: string): Promise<DeleteJobPostResult> {
    const response = await api.delete<ApiResponse<DeleteJobPostResult>>(`/api/v1/admin/job-posts/${id}`)

    return getApiResponseData(response.data)
  },

  async getDepartments(): Promise<DepartmentOption[]> {
    const response = await api.get<ApiResponse<DepartmentOption[]>>('/api/v1/admin/departments')

    return getApiResponseData(response.data)
  },

  async createJobPost(payload: CreateJobPostRequest): Promise<JobPostCreatedResponse> {
    const response = await api.post<ApiResponse<JobPostCreatedResponse>>(
      '/api/v1/admin/job-posts',
      payload,
    )

    return getApiResponseData(response.data)
  },

  async updateJobPost(id: string, payload: UpdateJobPostRequest): Promise<JobPostDetail> {
    const response = await api.put<ApiResponse<JobPostDetail>>(
      `/api/v1/admin/job-posts/${id}`,
      payload,
    )

    return getApiResponseData(response.data)
  },

  async closeJobPost(id: string): Promise<JobPostDetail> {
    const payload: CloseJobPostRequest = { action: 'Close' }
    const response = await api.put<ApiResponse<JobPostDetail>>(
      `/api/v1/admin/job-posts/${id}`,
      payload,
    )

    return getApiResponseData(response.data)
  },
}
