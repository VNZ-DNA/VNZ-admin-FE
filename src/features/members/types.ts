export interface TeamMemberListItem {
  id: string
  displayName: string | null
  fullName: string
  email: string
  position: string | null
  jobLevel: string | null
  avatarUrl: string | null
  animationUrl: string | null
  audioUrl: string | null
  hometown: string | null
  backgroundUrl: string | null
  hobbies: string | null
  personalQuote: string | null
  joinedDate: string | null
  employmentStatus: string
  isActive: boolean
  isPublished: boolean
  displayOrder: number | null
  createdAt: string
  updatedAt: string | null
  canDelete?: boolean
  deleteBlockedReason?: string | null
}

export const TEAM_MEMBER_JOB_LEVELS = [
  'Intern',
  'Fresher',
  'Junior',
  'Middle',
  'Senior',
  'Lead',
] as const

export type TeamMemberJobLevel = (typeof TEAM_MEMBER_JOB_LEVELS)[number]

export const TEAM_MEMBER_EMPLOYMENT_STATUSES = ['Working', 'Resigned'] as const

export type TeamMemberEmploymentStatus = (typeof TEAM_MEMBER_EMPLOYMENT_STATUSES)[number]

export type TeamMemberDetail = TeamMemberListItem

export interface GetTeamMembersParams {
  search?: string
  status?: TeamMemberEmploymentStatus[]
  position?: string[]
  jobLevel?: string[]
  page?: number
  pageSize?: number
}

export interface TeamMemberFilterOptions {
  positions: string[]
  jobLevels: string[]
}

export interface TeamMemberPagedResult {
  items: TeamMemberListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface OrderableTeamMember {
  id: string
  fullName: string
  position: string | null
  avatarUrl: string | null
  displayOrder: number
}

export interface CreateTeamMemberRequest {
  displayName: string | null
  fullName: string
  email: string
  position: string
  jobLevel: TeamMemberJobLevel
  joinedDate: string
  avatarUrl: string | null
  animationUrl: string | null
  audioUrl: string | null
  hometown: string | null
  backgroundUrl: string | null
  hobbies: string | null
  personalQuote: string | null
}

export interface UpdateTeamMemberProfileRequest {
  displayName: string | null
  fullName: string
  email: string
  position: string
  jobLevel: TeamMemberJobLevel
  joinedDate: string
  avatarUrl: string | null
  animationUrl: string | null
  audioUrl: string | null
  hometown: string | null
  backgroundUrl: string | null
  hobbies: string | null
  personalQuote: string | null
  employmentStatus: TeamMemberEmploymentStatus
}

export interface PublishTeamMemberRequest {
  isPublished: true
}

export interface UnpublishTeamMemberRequest {
  isPublished: false
}

export type UpdateTeamMemberRequest =
  | UpdateTeamMemberProfileRequest
  | PublishTeamMemberRequest
  | UnpublishTeamMemberRequest

export interface ReorderTeamMembersRequest {
  orderedMemberIds: string[]
}

export interface DeleteTeamMemberResult {
  id: string
}
