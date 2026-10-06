export interface PendingTask {
  type: string
  count: number
  label: string
}

export interface RecentPost {
  id: string
  title: string
  authorName: string
  status: string
  createdAtUtc: string
}

export interface DashboardData {
  totalNewsCount: number
  newsByStatus: Record<string, number>
  openJobsCount: number
  pendingApplicationsCount: number
  unreadContactsCount: number
  pendingTasks: PendingTask[]
  recentPosts: RecentPost[]
}
