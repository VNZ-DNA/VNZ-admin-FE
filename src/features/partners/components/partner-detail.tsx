import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PartnerLogoPreview } from '@/features/partners/components/partner-logo-preview'
import { PartnerDeleteConfirmationModal } from '@/features/partners/components/partner-delete-confirmation-modal'
import { useDeletePartner } from '@/features/partners/hooks/use-delete-partner'
import { usePartnerDetail } from '@/features/partners/hooks/use-partner-detail'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function getDetailError(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Không tìm thấy đối tác',
        message: error.response.data?.message || 'Đối tác này không tồn tại.',
      }
    }

    return {
      title: 'Không thể tải chi tiết đối tác',
      message: error.response?.data?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
    }
  }

  return {
    title: 'Không thể tải chi tiết đối tác',
    message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
  }
}

function getDeleteErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể xóa đối tác. Vui lòng thử lại.'
  }

  if (error instanceof Error && error.message) return error.message
  return 'Không thể xóa đối tác. Vui lòng thử lại.'
}

function PartnerDetailSkeleton() {
  return (
    <section className="partner-detail partner-detail--loading" aria-label="Đang tải chi tiết đối tác">
      <Skeleton className="partner-detail__skeleton-breadcrumb" />
      <Skeleton className="partner-detail__skeleton-summary" />
      <Skeleton className="partner-detail__skeleton-content" />
    </section>
  )
}

type PartnerDetailProps = {
  id: string
}

export function PartnerDetail({ id }: PartnerDetailProps) {
  const navigate = useNavigate()
  const partnerQuery = usePartnerDetail(id)
  const deleteConfirmation = useOverlayState()
  const deletePartner = useDeletePartner()

  if (partnerQuery.isPending) return <PartnerDetailSkeleton />

  if (!partnerQuery.data || partnerQuery.error) {
    const error = getDetailError(partnerQuery.error)

    return (
      <section className="partner-detail__error">
        <h1>{error.title}</h1>
        <p>{error.message}</p>
        <Button type="button" variant="primary" onClick={() => void partnerQuery.refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const partner = partnerQuery.data
  const canDelete = partner.canDelete === true
  const deleteBlockedReason = partner.deleteBlockedReason === 'PUBLIC_VISIBLE'
    ? 'Đối tác đang hiển thị công khai. Hãy gỡ đăng trước khi xóa.'
    : undefined

  async function confirmDelete() {
    if (deletePartner.isPending || !canDelete) return

    try {
      await deletePartner.mutateAsync(partner.id)
      deleteConfirmation.close()
      navigate(ROUTE_PATHS.PARTNERS, { state: { partnerNavigation: 'back-to-list' } })
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <section className="partner-detail">
      <nav className="partner-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.PARTNERS} state={{ partnerNavigation: 'back-to-list' }}>Đối tác</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết đối tác</span>
      </nav>

      <header className="partner-detail__heading partner-detail__heading--actions-only">
        <div className="partner-detail__toolbar" aria-label="Thao tác đối tác">
          <Button
            className="partner-detail__action partner-detail__action--edit"
            type="button"
            variant="secondary"
            isDisabled={deletePartner.isPending}
            onClick={() => navigate(ROUTE_PATHS.PARTNER_EDIT.replace(':id', partner.id))}
          >
            Chỉnh sửa
          </Button>
          <Button
            className="partner-detail__action partner-detail__action--delete"
            type="button"
            variant="outline"
            isDisabled={!canDelete || deletePartner.isPending}
            aria-label={deleteBlockedReason || 'Xóa đối tác'}
            onClick={() => {
              deletePartner.reset()
              deleteConfirmation.open()
            }}
          >
            Xóa
          </Button>
        </div>
      </header>

      {deletePartner.error && !deleteConfirmation.isOpen && (
        <p className="partner-detail__action-error" role="alert">
          {getDeleteErrorMessage(deletePartner.error)}
        </p>
      )}

      <div className="partner-detail__sheet">
        <section className="partner-detail__summary-card">
          <div className="partner-detail__summary-main">
            <PartnerLogoPreview src={partner.logoUrl} alt={`Logo ${partner.name}`} compact />
            <div>
              <strong>{partner.name}</strong>
            </div>
          </div>
          <Chip
            className={`partner-detail__publish partner-detail__publish--${
              partner.isPublished ? 'published' : 'unpublished'
            }`}
            color="default"
            size="sm"
            variant="secondary"
          >
            {partner.isPublished ? 'Đã đăng' : 'Chưa đăng'}
          </Chip>
        </section>

        <div className="partner-detail__detail-columns">
          <div className="partner-detail__assets-column">
            <dl className="partner-detail__info-list">
              <div className="partner-detail__info-field">
                <dt>Website URL</dt>
                <dd>
                  {partner.websiteUrl ? (
                    <a href={partner.websiteUrl} target="_blank" rel="noreferrer">
                      {partner.websiteUrl}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="partner-detail__info-field">
                <dt>Description</dt>
                <dd>{partner.description || 'Chưa có mô tả đối tác.'}</dd>
              </div>
            </dl>
          </div>

          <div className="partner-detail__logo-column">
            <PartnerLogoPreview src={partner.logoUrl} alt={`Preview logo ${partner.name}`} />
          </div>
        </div>
      </div>

      <PartnerDeleteConfirmationModal
        state={deleteConfirmation}
        partnerName={partner.name}
        isPending={deletePartner.isPending}
        errorMessage={deletePartner.error ? getDeleteErrorMessage(deletePartner.error) : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
