export type JobPostStatusFilter = 'Draft' | 'Open' | 'Closed' | 'Expired'

export interface JobPostListItem {
  id: string
  title: string
  shortDescription: string | null
  expiredDate: string | null
  numberOfPositions: number
  status: string
  pendingApplicationCount: number
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export interface PagedJobPostList {
  items: JobPostListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface JobPostEnglishTranslation {
  title?: string | null
  shortDescription?: string | null
  description?: string | null
  requirements?: string | null
}

export interface JobPostTranslations {
  en?: JobPostEnglishTranslation | null
}

export interface GetJobPostsParams {
  search?: string
  status?: JobPostStatusFilter[]
  departmentId?: string[]
  jobLevel?: JobPostLevel[]
  page: number
  pageSize: number
}

export interface JobPostDetail {
  id: string
  title: string | null
  createdByName: string | null
  updatedAt: string | null
  status: string
  expiredDate: string | null
  departmentId?: string | null
  department: string | null
  employmentType: string | null
  jobLevel: string | null
  numberOfPositions: number
  skills: string[] | null
  shortDescription: string | null
  description: string | null
  requirements: string | null
  translations: JobPostTranslations | null
  canEdit: boolean
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export const JOB_POST_EMPLOYMENT_TYPES = ['Internship', 'FullTime', 'PartTime', 'Contract'] as const
export type JobPostEmploymentType = (typeof JOB_POST_EMPLOYMENT_TYPES)[number]

export const JOB_POST_LEVELS = ['Intern', 'Fresher', 'Junior', 'Middle', 'Senior', 'Lead'] as const
export type JobPostLevel = (typeof JOB_POST_LEVELS)[number]

export type JobPostCreateAction = 'SavedDraft' | 'Publish'
export type JobPostUpdateAction = JobPostCreateAction | 'Close'

export interface DepartmentOption {
  id: string
  name: string
}

export interface CreateJobPostRequest {
  title?: string | null
  departmentId?: string | null
  employmentType?: JobPostEmploymentType | null
  jobLevel?: JobPostLevel | null
  numberOfPositions?: number | null
  skills?: string[] | null
  shortDescription?: string | null
  description?: string | null
  requirements?: string | null
  expiredDate?: string | null
  action: JobPostCreateAction
  translations?: JobPostTranslations | null
}

export type UpdateJobPostRequest = Omit<CreateJobPostRequest, 'action'> & {
  action: JobPostCreateAction
}

export interface CloseJobPostRequest {
  action: 'Close'
}

export interface JobPostCreatedResponse {
  id: string
  status: string
  expiredDate: string | null
  createdBy: string
  createdAt: string
  isPubliclyVisible: boolean
}

export interface DeleteJobPostResult {
  id: string
}

