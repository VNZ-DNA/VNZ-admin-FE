export type JobPostStatusKind = 'Draft' | 'Open' | 'Closed' | 'Expired' | 'Unknown'

export function getJobPostStatusKind(status: string): JobPostStatusKind {
  const normalized = status.trim().toLocaleLowerCase('vi-VN')

  if (normalized === 'draft' || normalized === 'bản nháp') return 'Draft'
  if (normalized === 'open' || normalized === 'đang tuyển') return 'Open'
  if (normalized === 'closed' || normalized === 'đã đóng') return 'Closed'
  if (normalized === 'expired' || normalized === 'đã hết hạn') return 'Expired'

  return 'Unknown'
}

export function isJobPostEditableStatus(status: string): boolean {
  const statusKind = getJobPostStatusKind(status)

  return statusKind === 'Draft' || statusKind === 'Open'
}
