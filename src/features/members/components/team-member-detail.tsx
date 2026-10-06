import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { TeamMemberDeleteConfirmationModal } from '@/features/members/components/team-member-delete-confirmation-modal'
import { useTeamMemberDetail } from '@/features/members/hooks/use-team-member-detail'
import { useDeleteTeamMember } from '@/features/members/hooks/use-delete-team-member'
import type { TeamMemberDetail as TeamMemberDetailType } from '@/features/members/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

type TeamMemberDetailProps = {
  id: string
}

type DetailItemProps = {
  label: string
  value: string | number | null | undefined
  wide?: boolean
}

function formatDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date)
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function DetailItem({ label, value, wide = false }: DetailItemProps) {
  const displayValue = value === null || value === undefined || value === '' ? '—' : String(value)

  return (
    <div className={`team-member-detail__item team-member-detail__field ${wide ? 'team-member-detail__item--wide' : ''}`}>
      <span className="team-member-detail__field-label">{label}</span>
      <div className="team-member-detail__field-value">{displayValue}</div>
    </div>
  )
}

function getDetailError(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return { title: 'Không tìm thấy thành viên', message: 'Thành viên này không tồn tại hoặc đã không còn khả dụng.' }
    }

    return {
      title: 'Không thể tải thông tin thành viên',
      message: error.response?.data?.message || 'Vui lòng thử lại.',
    }
  }

  return { title: 'Không thể tải thông tin thành viên', message: 'Vui lòng thử lại.' }
}

function TeamMemberDetailSkeleton() {
  return (
    <section className="team-member-detail team-member-detail--loading" aria-label="Đang tải thông tin thành viên">
      <Skeleton className="team-member-detail__skeleton-breadcrumb" />
      <div className="team-member-detail__toolbar">
        <Skeleton className="team-member-detail__skeleton-action" />
        <Skeleton className="team-member-detail__skeleton-action" />
      </div>
      <div className="team-member-detail__layout">
        <div className="team-member-detail__content-card">
          <Skeleton className="team-member-detail__skeleton-profile" />
          <div className="team-member-detail__skeleton-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton className="team-member-detail__skeleton-item" key={index} />
            ))}
          </div>
        </div>
        <Skeleton className="team-member-detail__status-card team-member-detail__skeleton-status" />
      </div>
    </section>
  )
}

function getDeleteErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể xóa thành viên. Vui lòng thử lại.'
  }

  if (error instanceof Error && error.message) return error.message
  return 'Không thể xóa thành viên. Vui lòng thử lại.'
}

function DetailContent({ member }: { member: TeamMemberDetailType }) {
  const navigate = useNavigate()
  const deleteConfirmation = useOverlayState()
  const deleteTeamMember = useDeleteTeamMember()
  const canDelete = member.canDelete === true
  const deleteBlockedReason = member.deleteBlockedReason === 'PUBLIC_VISIBLE'
    ? 'Thành viên đang hiển thị công khai. Hãy tắt hiển thị trước khi xóa.'
    : undefined

  async function confirmDelete() {
    if (deleteTeamMember.isPending || !canDelete) return

    try {
      await deleteTeamMember.mutateAsync(member.id)
      deleteConfirmation.close()
      navigate(ROUTE_PATHS.MEMBERS, { state: { memberNavigation: 'back-to-list' } })
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <section className="team-member-detail">
      <nav className="team-member-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.MEMBERS} state={{ memberNavigation: 'back-to-list' }}>
          Thành viên
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết thành viên</span>
      </nav>

      <header className="team-member-detail__toolbar" aria-label="Thao tác thành viên">
        <Button
          className="team-member-detail__action team-member-detail__action--edit"
          type="button"
          variant="secondary"
          isDisabled={deleteTeamMember.isPending}
          onClick={() => navigate(ROUTE_PATHS.MEMBER_EDIT.replace(':id', member.id))}
        >
          Chỉnh sửa
        </Button>
        <Button
          className="team-member-detail__action team-member-detail__action--delete"
          type="button"
          variant="outline"
          isDisabled={!canDelete || deleteTeamMember.isPending}
          aria-label={deleteBlockedReason || 'Xóa thành viên'}
          onClick={() => {
            if (!canDelete) return
            deleteTeamMember.reset()
            deleteConfirmation.open()
          }}
        >
          Xóa
        </Button>
      </header>

      <div className="team-member-detail__layout">
        <article className="team-member-detail__content-card">
          <Chip className="team-member-detail__working-status team-member-detail__status-chip team-member-detail__status-chip--published" size="sm" variant="secondary">
            {member.employmentStatus || '—'}
          </Chip>
          <div className="team-member-detail__profile">
            <span className="team-member-detail__avatar" aria-hidden="true">
              {getInitials(member.fullName)}
            </span>
            <div className="team-member-detail__profile-copy">
              <h1 className="team-member-detail__identity-title">
                <span>{member.fullName}</span>
                <span className="team-member-detail__identity-id">/{member.id}</span>
              </h1>
            </div>
          </div>

          <div className="team-member-detail__section">
            <h2>Thông tin cơ bản</h2>
            <div className="team-member-detail__basic-columns">
              <div className="team-member-detail__basic-column">
                <div className="team-member-detail__identity-fields">
                  <DetailItem label="Họ và tên" value={member.fullName} />
                  <DetailItem label="Tên hiển thị" value={member.displayName} />
                </div>
                <DetailItem label="Email" value={member.email} />
                <DetailItem label="Quê quán" value={member.hometown} />
                <DetailItem label="Ngày tham gia" value={formatDate(member.joinedDate)} />
              </div>
              <div className="team-member-detail__basic-column">
                <DetailItem label="Vị trí" value={member.position} />
                <DetailItem label="Cấp bậc" value={member.jobLevel} />
                <DetailItem label="Trạng thái làm việc" value={member.employmentStatus} />
              </div>
            </div>
          </div>

          <div className="team-member-detail__section">
            <h2>Thông tin hồ sơ</h2>
            <div className="team-member-detail__grid">
              <DetailItem label="Avatar URL" value={member.avatarUrl} wide />
              <DetailItem label="Animation URL" value={member.animationUrl} wide />
              <DetailItem label="Audio URL" value={member.audioUrl} wide />
              <DetailItem label="Background URL" value={member.backgroundUrl} wide />
              <DetailItem label="Sở thích" value={member.hobbies} wide />
              <DetailItem label="Châm ngôn sống" value={member.personalQuote} wide />
            </div>
          </div>
        </article>

        <aside className="team-member-detail__status-card">
          <h2>Trạng thái hệ thống</h2>
          <dl className="team-member-detail__status-list">
            <div>
              <dt>Tài khoản</dt>
              <dd>{member.isActive ? 'Đang hoạt động' : 'Không hoạt động'}</dd>
            </div>
            <div>
              <dt>Hiển thị website</dt>
              <dd>
                <Chip
                  className={`team-member-detail__status-chip ${member.isPublished ? 'team-member-detail__status-chip--published' : 'team-member-detail__status-chip--unpublished'}`}
                  size="sm"
                  variant="secondary"
                >
                  {member.isPublished ? 'Đã đăng' : 'Chưa đăng'}
                </Chip>
              </dd>
            </div>
            <div>
              <dt>Thứ tự hiển thị</dt>
              <dd>{member.displayOrder ?? '—'}</dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatDateOnly(member.createdAt)}</dd>
            </div>
            <div>
              <dt>Cập nhật gần nhất</dt>
              <dd>{formatDateOnly(member.updatedAt ?? member.createdAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <TeamMemberDeleteConfirmationModal
        state={deleteConfirmation}
        memberName={member.fullName}
        isPending={deleteTeamMember.isPending}
        errorMessage={deleteTeamMember.error ? getDeleteErrorMessage(deleteTeamMember.error) : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}

export function TeamMemberDetail({ id }: TeamMemberDetailProps) {
  const navigate = useNavigate()
  const { data, error, isPending, refetch } = useTeamMemberDetail(id)

  if (isPending) return <TeamMemberDetailSkeleton />

  if (!data || error) {
    const errorCopy = getDetailError(error)
    return (
      <section className="team-member-detail__error">
        <h1>{errorCopy.title}</h1>
        <p>{errorCopy.message}</p>
        <div className="team-member-detail__error-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTE_PATHS.MEMBERS, { state: { memberNavigation: 'back-to-list' } })}
          >
            Quay lại danh sách
          </Button>
          <Button type="button" variant="primary" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      </section>
    )
  }

  return <DetailContent member={data} />
}
