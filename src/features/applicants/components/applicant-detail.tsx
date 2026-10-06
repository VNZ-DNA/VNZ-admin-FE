import { Button, Chip, Modal, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useJobApplicationDetail } from '@/features/applicants/hooks/use-job-application-detail'
import { useReviewJobApplication } from '@/features/applicants/hooks/use-review-job-application'
import type {
  JobApplicationDetail as JobApplicationDetailData,
  JobApplicationReviewDecision,
  JobPostSnapshot,
} from '@/features/applicants/types'
import { RichTextContent } from '@/features/news/components/rich-text-content'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDateOnly(value: string | null): string {
  if (!value) return '—'

  const parts = value.slice(0, 10).split('-')
  if (parts.length !== 3) return value

  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('vi-VN')

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('vi-VN')
}

function normalizeStatus(status: string): string {
  return status.trim().toLocaleLowerCase('vi-VN')
}

function isPendingStatus(status: string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'pending' || normalized === 'chờ duyệt'
}

function getStatusClassName(status: string): string {
  const normalized = normalizeStatus(status)

  if (normalized === 'pending' || normalized === 'chờ duyệt') return 'applicant-detail__status--pending'
  if (normalized === 'accepted' || normalized === 'đã duyệt') return 'applicant-detail__status--accepted'
  if (normalized === 'rejected' || normalized === 'không duyệt') return 'applicant-detail__status--rejected'
  if (normalized === 'sendedemail' || normalized === 'đã gửi email phỏng vấn') {
    return 'applicant-detail__status--sent-email'
  }

  return 'applicant-detail__status--default'
}

function formatEmploymentType(value: string): string {
  const labels: Record<string, string> = {
    FullTime: 'Full-time',
    PartTime: 'Part-time',
    Internship: 'Thực tập',
    Contract: 'Hợp đồng',
  }

  return labels[value] ?? value
}

function getDetailErrorMessage(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Không tìm thấy hồ sơ ứng viên',
        message: error.response.data?.message || 'Hồ sơ này không tồn tại hoặc không còn khả dụng.',
      }
    }

    return {
      title: 'Không thể tải chi tiết ứng viên',
      message: error.response?.data?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
    }
  }

  return {
    title: 'Không thể tải chi tiết ứng viên',
    message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
  }
}

type ReviewErrorInfo = {
  code: string | null
  message: string
  blocksFurtherReview: boolean
}

function getReviewErrorInfo(error: unknown): ReviewErrorInfo {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const code = error.response?.data?.errors?.code ?? null

    if (code === 'JOB_APPLICATION_REJECTION_EMAIL_FAILED') {
      return {
        code,
        message:
          'Không thể gửi email từ chối. Hồ sơ vẫn ở trạng thái Chờ duyệt và chưa ghi nhận quyết định. Bạn có thể thử lại.',
        blocksFurtherReview: false,
      }
    }

    if (code === 'JOB_APPLICATION_REJECTION_PERSIST_FAILED') {
      return {
        code,
        message:
          'Email từ chối có thể đã được gửi nhưng hệ thống chưa lưu được trạng thái hồ sơ. Không gửi lại ngay; vui lòng tải lại hoặc kiểm tra trước khi thao tác tiếp.',
        blocksFurtherReview: true,
      }
    }

    return {
      code,
      message: error.response?.data?.message || 'Không thể cập nhật trạng thái hồ sơ. Vui lòng thử lại.',
      blocksFurtherReview: false,
    }
  }

  return {
    code: null,
    message: 'Không thể cập nhật trạng thái hồ sơ. Vui lòng thử lại.',
    blocksFurtherReview: false,
  }
}

function ApplicantDetailSkeleton() {
  return (
    <section className="applicant-detail applicant-detail--loading" aria-label="Đang tải chi tiết ứng viên">
      <Skeleton className="applicant-detail__skeleton-main" />
      <Skeleton className="applicant-detail__skeleton-side" />
    </section>
  )
}

function SnapshotPanel({ snapshot }: { snapshot: JobPostSnapshot | null }) {
  if (!snapshot) {
    return (
      <aside className="applicant-detail__job-panel">
        <span className="applicant-detail__job-eyebrow">TIN TUYỂN DỤNG ĐÃ ỨNG TUYỂN</span>
        <p className="applicant-detail__job-empty">Không có dữ liệu tuyển dụng đã lưu cho hồ sơ này.</p>
      </aside>
    )
  }

  const skills = snapshot.jobSkillsSnapshot?.skills.filter((skill) => skill.trim()) ?? []

  return (
    <aside className="applicant-detail__job-panel">
      <span className="applicant-detail__job-eyebrow">TIN TUYỂN DỤNG ĐÃ ỨNG TUYỂN</span>
      <h2>{snapshot.title}</h2>

      <div className="applicant-detail__job-summary">
        <div>
          <span>BỘ PHẬN</span>
          <strong>{snapshot.departmentName || '—'}</strong>
        </div>
        <div>
          <span>HÌNH THỨC</span>
          <strong>{formatEmploymentType(snapshot.employmentType) || '—'}</strong>
        </div>
        <div>
          <span>CẤP BẬC</span>
          <strong>{snapshot.jobLevel || '—'}</strong>
        </div>
        <div>
          <span>CHỈ TIÊU</span>
          <strong>{String(snapshot.numberOfPositions).padStart(2, '0')} người</strong>
        </div>
      </div>

      <div className="applicant-detail__job-section">
        <h3>Mô tả công việc</h3>
        <RichTextContent html={snapshot.description} className="applicant-detail__job-rich-text" />
      </div>

      <div className="applicant-detail__job-section">
        <h3>Yêu cầu ứng viên</h3>
        <RichTextContent html={snapshot.requirements} className="applicant-detail__job-rich-text" />
      </div>

      <div className="applicant-detail__job-section">
        <h3>Kỹ năng yêu cầu</h3>
        {skills.length > 0 ? (
          <div className="applicant-detail__skill-list">
            {skills.map((skill) => (
              <Chip key={skill} className="applicant-detail__skill" color="default" size="sm" variant="secondary">
                {skill}
              </Chip>
            ))}
          </div>
        ) : (
          <p>—</p>
        )}
      </div>
    </aside>
  )
}

type ApplicantDetailContentProps = {
  application: JobApplicationDetailData
  refetch: () => Promise<unknown>
}

function ApplicantDetailContent({ application, refetch }: ApplicantDetailContentProps) {
  const confirmation = useOverlayState()
  const reviewMutation = useReviewJobApplication(application.id)
  const [decision, setDecision] = useState<JobApplicationReviewDecision | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewBlocked, setReviewBlocked] = useState(false)
  const isReviewable = isPendingStatus(application.status)
  const isSaving = reviewMutation.isPending

  function openConfirmation(nextDecision: JobApplicationReviewDecision) {
    if (reviewBlocked) return
    setReviewError(null)
    setDecision(nextDecision)
    confirmation.open()
  }

  function closeConfirmation() {
    if (isSaving) return
    if (!reviewBlocked) setReviewError(null)
    setDecision(null)
    confirmation.close()
  }

  async function confirmReview() {
    if (!decision || isSaving) return

    try {
      await reviewMutation.mutateAsync({ decision })
      setReviewError(null)
      setReviewBlocked(false)
      setDecision(null)
      confirmation.close()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        confirmation.close()
        setDecision(null)
        setReviewBlocked(false)
        setReviewError('Hồ sơ này đã được xử lý bởi một phiên khác. Dữ liệu đã được tải lại.')
        await refetch()
        return
      }

      const errorInfo = getReviewErrorInfo(error)
      setReviewError(errorInfo.message)

      if (errorInfo.blocksFurtherReview) {
        setReviewBlocked(true)
        await refetch()
      }
    }
  }

  const snapshot = application.jobPostSnapshot

  return (
    <section className="applicant-detail">
      <nav className="applicant-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.APPLICANTS} state={{ applicantNavigation: 'back-to-list' }}>Hồ sơ ứng viên</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết ứng viên</span>
      </nav>

      {isReviewable && (
        <div className="applicant-detail__actions">
          <Button
            className="applicant-detail__reject"
            type="button"
            variant="outline"
            isDisabled={isSaving || reviewBlocked}
            onClick={() => openConfirmation('Rejected')}
          >
            Không duyệt
          </Button>
          <Button
            className="applicant-detail__accept"
            type="button"
            variant="primary"
            isDisabled={isSaving || reviewBlocked}
            onClick={() => openConfirmation('Accepted')}
          >
            Duyệt ứng viên
          </Button>
        </div>
      )}

      <div className="applicant-detail__main-card">
        <div className="applicant-detail__profile-card">
          <div className="applicant-detail__avatar" aria-hidden="true">{getInitials(application.fullName)}</div>
          <div className="applicant-detail__profile-copy">
            <strong>{application.fullName}</strong>
            <span>Ứng tuyển: {snapshot?.title || '—'}</span>
            <span>Nộp hồ sơ: {formatDateTime(application.createdAt)}</span>
          </div>
          <Chip
            className={`applicant-detail__status ${getStatusClassName(application.status)}`}
            color="default"
            size="sm"
            variant="secondary"
          >
            {application.status}
          </Chip>
        </div>

        <div className="applicant-detail__content-section">
          <h2>Thông tin cá nhân</h2>
          <div className="applicant-detail__info-grid">
            <div><span>Họ và tên</span><strong>{application.fullName}</strong></div>
            <div><span>Email</span><strong>{application.email}</strong></div>
            <div><span>Điện thoại / Zalo</span><strong>{application.phone || '—'}</strong></div>
            <div><span>Năm tốt nghiệp</span><strong>{application.graduationYear ?? '—'}</strong></div>
            <div><span>Trường</span><strong>{application.university || '—'}</strong></div>
            <div><span>Chuyên ngành</span><strong>{application.major || '—'}</strong></div>
          </div>
        </div>

        <div className="applicant-detail__content-section">
          <h2>Hồ sơ & liên kết</h2>
          <div className="applicant-detail__link-grid">
            <div>
              <span>CV</span>
              {application.cvUrl ? (
                <a href={application.cvUrl} target="_blank" rel="noreferrer">
                  {application.cvUrl} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                <strong>—</strong>
              )}
            </div>
            <div>
              <span>Portfolio / GitHub / LinkedIn</span>
              {application.portfolioUrl ? (
                <a href={application.portfolioUrl} target="_blank" rel="noreferrer">
                  {application.portfolioUrl} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                <strong>—</strong>
              )}
            </div>
          </div>

          <div className="applicant-detail__cover-letter">
            <span>Giới thiệu về bạn</span>
            <p>{application.coverLetter || '—'}</p>
          </div>
        </div>

        <div className="applicant-detail__content-section applicant-detail__content-section--last">
          <h2>Thời gian & nguồn ứng tuyển</h2>
          <div className="applicant-detail__info-grid">
            <div><span>Thời gian có thể tham gia</span><strong>{application.availability || '—'}</strong></div>
            <div><span>Có thể bắt đầu</span><strong>{formatDateOnly(application.availableStartDate)}</strong></div>
            <div><span>Biết tin tuyển dụng qua</span><strong>{application.referralSource || '—'}</strong></div>
          </div>
        </div>

        {reviewError && <p className="applicant-detail__review-error" role="alert">{reviewError}</p>}

      </div>

      <SnapshotPanel snapshot={snapshot} />

      <Modal.Root state={confirmation}>
        <Modal.Backdrop className="applicant-review-confirm__backdrop" isDismissable={!isSaving}>
          <Modal.Container className="applicant-review-confirm__container" placement="center" size="md">
            <Modal.Dialog className="applicant-review-confirm__dialog">
              <Modal.Header className="applicant-review-confirm__header">
                <Modal.Icon className="applicant-review-confirm__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <Modal.Heading>
                  {decision === 'Accepted' ? 'Xác nhận duyệt ứng viên?' : 'Xác nhận không duyệt ứng viên?'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="applicant-review-confirm__body">
                <p>
                  {decision === 'Accepted'
                    ? `${application.fullName} sẽ được chuyển sang trạng thái Đã duyệt. Email phỏng vấn chưa được gửi ở bước này; sau đó bạn có thể quay lại danh sách, chọn ứng viên và chọn ngày/giờ để gửi email.`
                    : `Hệ thống sẽ gửi email từ chối ngay đến ${application.email}. Chỉ khi email gửi thành công, hồ sơ của ${application.fullName} mới chuyển sang trạng thái Không duyệt.`}
                </p>
                {reviewError && <p className="applicant-review-confirm__error" role="alert">{reviewError}</p>}
              </Modal.Body>
              <Modal.Footer className="applicant-review-confirm__footer">
                <Button type="button" variant="outline" isDisabled={isSaving} onClick={closeConfirmation}>
                  Hủy
                </Button>
                <Button
                  className={decision === 'Rejected' ? 'applicant-review-confirm__reject' : 'applicant-review-confirm__accept'}
                  type="button"
                  variant="primary"
                  isDisabled={!decision || isSaving || reviewBlocked}
                  onClick={() => void confirmReview()}
                >
                  {isSaving
                    ? decision === 'Rejected'
                      ? 'Đang gửi email...'
                      : 'Đang duyệt...'
                    : decision === 'Accepted'
                      ? 'Duyệt ứng viên'
                      : 'Không duyệt'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </section>
  )
}

type ApplicantDetailProps = {
  id: string
}

export function ApplicantDetail({ id }: ApplicantDetailProps) {
  const { data, error, isPending, refetch } = useJobApplicationDetail(id)

  if (isPending) return <ApplicantDetailSkeleton />

  if (!data || error) {
    const errorContent = getDetailErrorMessage(error)

    return (
      <section className="applicant-detail__error">
        <h1>{errorContent.title}</h1>
        <p>{errorContent.message}</p>
        <div className="applicant-detail__error-actions">
          <Button type="button" variant="primary" onClick={() => void refetch()}>Thử lại</Button>
          <Link
            className="applicant-detail__back-link"
            to={ROUTE_PATHS.APPLICANTS}
            state={{ applicantNavigation: 'back-to-list' }}
          >
            Quay lại danh sách
          </Link>
        </div>
      </section>
    )
  }

  return <ApplicantDetailContent application={data} refetch={refetch} />
}
