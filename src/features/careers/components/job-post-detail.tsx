import { Button, Chip, Modal, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, ChevronRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { useCloseJobPost } from '@/features/careers/hooks/use-close-job-post'
import { useDeleteJobPost } from '@/features/careers/hooks/use-delete-job-post'
import { useJobPostDetail } from '@/features/careers/hooks/use-job-post-detail'
import { JobPostDeleteConfirmationModal } from '@/features/careers/components/job-post-delete-confirmation-modal'
import { getJobPostStatusKind } from '@/features/careers/job-post-status'
import { selectJobPostContent } from '@/features/careers/utils/job-post-content-locale'
import { RichTextContent } from '@/features/news/components/rich-text-content'
import type { ApiResponse } from '@/lib/http/api-response'
import type { ContentLocale } from '@/lib/content-locale'
import { ROUTE_PATHS } from '@/routes/route-paths'

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getStatusClassName(status: string): string {
  return status.toLocaleLowerCase('vi-VN').replaceAll(' ', '-')
}

function getErrorMessage(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Không tìm thấy tin tuyển dụng',
        message: error.response.data?.message || 'Tin tuyển dụng này không tồn tại hoặc đã bị xóa.',
      }
    }

    return {
      title: 'Không thể tải chi tiết tin tuyển dụng',
      message: error.response?.data?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
    }
  }

  return {
    title: 'Không thể tải chi tiết tin tuyển dụng',
    message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
  }
}

function getDeleteErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) return 'Không thể xóa tin tuyển dụng.'

  if (error.response?.data?.errors?.code === 'JOB_POST_DELETE_FORBIDDEN') {
    return 'Tin tuyển dụng đang hiển thị công khai. Hãy đóng tin trước khi xóa.'
  }

  return error.response?.data?.message || 'Không thể xóa tin tuyển dụng.'
}

function JobPostDetailSkeleton() {
  return (
    <section className="job-post-detail job-post-detail--loading" aria-label="Đang tải chi tiết tin tuyển dụng">
      <Skeleton className="job-post-detail__skeleton-breadcrumb" />
      <header className="job-post-detail__heading job-post-detail__heading--actions-only">
        <div className="job-post-detail__toolbar job-post-detail__skeleton-actions">
          <Skeleton />
          <Skeleton />
        </div>
      </header>
      <div className="job-post-detail__layout">
        <article className="job-post-detail__article-card job-post-detail__skeleton-content">
          <Skeleton className="job-post-detail__skeleton-title" />
          <Skeleton className="job-post-detail__skeleton-summary" />
          <Skeleton className="job-post-detail__skeleton-section" />
          <Skeleton className="job-post-detail__skeleton-section" />
          <Skeleton className="job-post-detail__skeleton-section" />
        </article>
        <aside className="job-post-detail__sidebar">
          <Skeleton className="job-post-detail__skeleton-info" />
        </aside>
      </div>
    </section>
  )
}

type JobPostDetailProps = {
  id: string
}

export function JobPostDetail({ id }: JobPostDetailProps) {
  const navigate = useNavigate()
  const closeConfirmation = useOverlayState()
  const deleteConfirmation = useOverlayState()
  const closeJobPost = useCloseJobPost(id)
  const deleteJobPost = useDeleteJobPost()
  const { data, error, isPending, refetch } = useJobPostDetail(id)
  const [contentLocale, setContentLocale] = useState<ContentLocale>('vi')

  if (isPending) {
    return <JobPostDetailSkeleton />
  }

  if (!data || error) {
    const errorContent = getErrorMessage(error)

    return (
      <section className="job-post-detail__error">
        <h1>{errorContent.title}</h1>
        <p>{errorContent.message}</p>
        <div className="job-post-detail__error-actions">
          <Button type="button" variant="primary" onClick={() => void refetch()}>
            Thử lại
          </Button>
          <Link
            className="job-post-detail__back-link"
            to={ROUTE_PATHS.CAREERS}
            state={{ careerNavigation: 'back-to-list' }}
          >
            Quay lại danh sách
          </Link>
        </div>
      </section>
    )
  }

  const creator = data.createdByName || '—'
  const updatedAt = formatDate(data.updatedAt)
  const expiredAt = formatDate(data.expiredDate)
  const skills = data.skills?.length ? data.skills.join(', ') : '—'
  const statusKind = getJobPostStatusKind(data.status)
  const statusClassName = getStatusClassName(statusKind)
  const canEdit = data.canEdit && (statusKind === 'Draft' || statusKind === 'Open')
  const canClose = data.canEdit && statusKind === 'Open'
  const canDelete = data.canDelete === true
  const displayedContent = selectJobPostContent(data, contentLocale)
  const isEnglishEmpty = contentLocale === 'en' && !data.translations?.en
  const contentLabels = contentLocale === 'en'
    ? { description: 'Job description', requirements: 'Candidate requirements', skills: 'Required skills' }
    : { description: 'Mô tả công việc', requirements: 'Yêu cầu ứng viên', skills: 'Kĩ năng yêu cầu' }
  const deleteBlockedReason = data.deleteBlockedReason === 'PUBLIC_VISIBLE'
    ? 'Tin tuyển dụng đang hiển thị công khai. Hãy đóng tin trước khi xóa.'
    : undefined

  async function confirmClose() {
    if (closeJobPost.isPending) return

    try {
      await closeJobPost.mutateAsync()
      closeConfirmation.close()
    } catch {
      // Keep the confirmation open so the backend error can be shown in context.
    }
  }

  async function confirmDelete() {
    if (deleteJobPost.isPending || !canDelete) return

    try {
      await deleteJobPost.mutateAsync(id)
      deleteConfirmation.close()
      navigate(ROUTE_PATHS.CAREERS, { state: { careerNavigation: 'back-to-list' } })
    } catch {
      // Keep the modal open so the backend error remains visible in context.
    }
  }

  return (
    <section className="job-post-detail">
      <nav className="job-post-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.CAREERS} state={{ careerNavigation: 'back-to-list' }}>Tuyển dụng</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết công việc</span>
      </nav>

      <header className="job-post-detail__heading job-post-detail__heading--actions-only">
        <div className="job-post-detail__toolbar" aria-label="Thao tác tin tuyển dụng">
          {canClose && (
            <Button
              className="job-post-detail__action job-post-detail__action--close"
              type="button"
              variant="outline"
              isDisabled={closeJobPost.isPending}
              onClick={() => {
                closeJobPost.reset()
                closeConfirmation.open()
              }}
            >
              Đóng
            </Button>
          )}
          {canEdit && (
            <Button
              className="job-post-detail__action job-post-detail__action--edit"
              type="button"
              variant="secondary"
              onClick={() => navigate(`/careers/${data.id}/edit`)}
            >
              Chỉnh sửa
            </Button>
          )}
          <Button
            className="job-post-detail__action job-post-detail__action--delete"
            type="button"
            variant="outline"
            isDisabled={!canDelete || closeJobPost.isPending || deleteJobPost.isPending}
            aria-label={deleteBlockedReason || 'Xóa tin tuyển dụng'}
            onClick={() => {
              deleteJobPost.reset()
              deleteConfirmation.open()
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Xóa
          </Button>
        </div>
      </header>

      <div className="job-post-detail__layout">
        <BilingualContentCard
          className="job-post-detail__article-card"
          value={contentLocale}
          onChange={setContentLocale}
        >
          <h1 className="job-post-detail__article-title">
            {displayedContent.title ?? (contentLocale === 'en' ? 'Chưa có tiêu đề English' : 'Chưa có tiêu đề')}
          </h1>
          {isEnglishEmpty ? (
            <p className="job-post-detail__translation-empty">Bản nháp này chưa có nội dung English.</p>
          ) : (
            <>
              {displayedContent.shortDescription && <p className="job-post-detail__summary">{displayedContent.shortDescription}</p>}

              <div className="job-post-detail__article-content">
                <section className="job-post-detail__content-section">
                  <h2>{contentLabels.description}</h2>
                  <RichTextContent html={displayedContent.description} className="job-post-detail__rich-text" />
                </section>

                <section className="job-post-detail__content-section">
                  <h2>{contentLabels.requirements}</h2>
                  <RichTextContent html={displayedContent.requirements} className="job-post-detail__rich-text" />
                </section>
              </div>
            </>
          )}
          <div className="job-post-detail__article-content">
            <section className="job-post-detail__content-section">
              <h2>{contentLabels.skills}</h2>
              <p>{skills}</p>
            </section>
          </div>
        </BilingualContentCard>

        <aside className="job-post-detail__sidebar">
          <section className="job-post-detail__info-card">
            <h2>Thông tin tuyển dụng</h2>
            <dl className="job-post-detail__info-list">
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <Chip
                    className={`job-post-detail__status job-post-detail__status--${statusClassName}`}
                    color="default"
                    size="sm"
                    variant="secondary"
                  >
                    {data.status}
                  </Chip>
                </dd>
              </div>
              <div>
                <dt>Phòng ban</dt>
                <dd>{data.department || '—'}</dd>
              </div>
              <div>
                <dt>Loại hình</dt>
                <dd>{data.employmentType || '—'}</dd>
              </div>
              <div>
                <dt>Cấp bậc</dt>
                <dd>{data.jobLevel || '—'}</dd>
              </div>
              <div>
                <dt>Chỉ tiêu</dt>
                <dd>{String(data.numberOfPositions).padStart(2, '0')} Nhân sự</dd>
              </div>
              <div>
                <dt>Hạn ứng tuyển</dt>
                <dd>{expiredAt}</dd>
              </div>
              <div>
                <dt>Ngày cập nhật</dt>
                <dd>{updatedAt}</dd>
              </div>
              <div>
                <dt>Người đăng</dt>
                <dd>{creator}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <JobPostDeleteConfirmationModal
        state={deleteConfirmation}
        jobPostTitle={data.title}
        isPending={deleteJobPost.isPending}
        errorMessage={deleteJobPost.error ? getDeleteErrorMessage(deleteJobPost.error) : null}
        onConfirm={() => void confirmDelete()}
      />

      <Modal.Root state={closeConfirmation}>
        <Modal.Backdrop className="job-post-close__backdrop" isDismissable={!closeJobPost.isPending}>
          <Modal.Container className="job-post-close__container" placement="center" size="md">
            <Modal.Dialog className="job-post-close__dialog">
              <Modal.Header className="job-post-close__header">
                <Modal.Icon className="job-post-close__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <Modal.Heading className="job-post-close__heading">
                  Xác nhận đóng tin tuyển dụng?
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="job-post-close__body">
                <p>
                  Sau khi đóng, tin “{data.title}” sẽ không thể chỉnh sửa lại và không còn được tuyển dụng công khai.
                </p>
                {closeJobPost.error && (
                  <p className="job-post-close__error" role="alert">
                    {axios.isAxiosError<ApiResponse<unknown>>(closeJobPost.error)
                      ? closeJobPost.error.response?.data?.message || 'Không thể đóng tin tuyển dụng.'
                      : 'Không thể đóng tin tuyển dụng.'}
                  </p>
                )}
              </Modal.Body>

              <Modal.Footer className="job-post-close__footer">
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={closeJobPost.isPending}
                  onClick={() => closeConfirmation.close()}
                >
                  Hủy
                </Button>
                <Button
                  className="job-post-close__submit"
                  type="button"
                  variant="primary"
                  isDisabled={closeJobPost.isPending}
                  onClick={() => void confirmClose()}
                >
                  {closeJobPost.isPending ? 'Đang đóng...' : 'Đóng tin'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </section>
  )
}
