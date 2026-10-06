import { getApiResponseData, type ApiResponse } from '@/lib/http/api-response'
import { api } from '@/lib/http/axios'
import { parseInterviewInvitationTemplate } from '@/features/applicants/schemas/interview-invitation-template.schema'

import type {
  JobApplicationDetail,
  JobApplicationFilterOptions,
  JobApplicationListParams,
  JobApplicationPagedResult,
  DeleteJobApplicationResult,
  InterviewInvitationTemplate,
  ReviewJobApplicationRequest,
  ReviewJobApplicationResponse,
  SendInterviewInvitationsRequest,
  SendInterviewInvitationsResult,
} from '@/features/applicants/types'

export const jobApplicationService = {
  async getJobApplications(params: JobApplicationListParams): Promise<JobApplicationPagedResult> {
    const trimmedSearch = params.search?.trim()
    const response = await api.get<ApiResponse<JobApplicationPagedResult>>(
      '/api/v1/admin/job-applications',
      {
        params: {
          ...(trimmedSearch ? { search: trimmedSearch } : {}),
          ...(params.status?.length ? { status: params.status } : {}),
          ...(params.jobPostId?.length ? { jobPostId: params.jobPostId } : {}),
          page: params.page,
          pageSize: params.pageSize,
        },
        paramsSerializer: { indexes: null },
      },
    )

    return getApiResponseData(response.data)
  },

  async getJobApplicationFilterOptions(): Promise<JobApplicationFilterOptions> {
    const response = await api.get<ApiResponse<JobApplicationFilterOptions>>(
      '/api/v1/admin/job-applications/filter-options',
    )

    return getApiResponseData(response.data)
  },

  async getJobApplication(id: string): Promise<JobApplicationDetail> {
    const response = await api.get<ApiResponse<JobApplicationDetail>>(
      `/api/v1/admin/job-applications/${id}`,
    )

    return getApiResponseData(response.data)
  },

  async deleteJobApplication(id: string): Promise<DeleteJobApplicationResult> {
    const response = await api.delete<ApiResponse<DeleteJobApplicationResult>>(
      `/api/v1/admin/job-applications/${id}`,
    )

    return getApiResponseData(response.data)
  },

  async reviewJobApplication(
    id: string,
    payload: ReviewJobApplicationRequest,
  ): Promise<ReviewJobApplicationResponse> {
    const response = await api.post<ApiResponse<ReviewJobApplicationResponse>>(
      `/api/v1/admin/job-applications/${id}/review`,
      payload,
    )

    return getApiResponseData(response.data)
  },

  async sendInterviewInvitations(
    payload: SendInterviewInvitationsRequest,
  ): Promise<SendInterviewInvitationsResult> {
    const response = await api.post<ApiResponse<SendInterviewInvitationsResult>>(
      '/api/v1/admin/job-applications/interview-invitations',
      payload,
    )

    return getApiResponseData(response.data)
  },

  async getInterviewInvitationTemplate(): Promise<InterviewInvitationTemplate> {
    const response = await api.get<ApiResponse<InterviewInvitationTemplate>>(
      '/api/v1/admin/job-applications/interview-invitations/template',
    )

    return parseInterviewInvitationTemplate(getApiResponseData(response.data))
  },
}
