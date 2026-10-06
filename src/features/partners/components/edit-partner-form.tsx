import { Button, Modal, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { PartnerLogoUpload } from '@/features/partners/components/partner-logo-upload'
import { PartnerLogoPreview } from '@/features/partners/components/partner-logo-preview'
import { usePartnerDetail } from '@/features/partners/hooks/use-partner-detail'
import { useUpdatePartner } from '@/features/partners/hooks/use-update-partner'
import type { PartnerDetail, UpdatePartnerProfileRequest } from '@/features/partners/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

type PartnerEditFormValues = {
  name: string
  websiteUrl: string
  description: string
}

type EditPartnerFormProps = {
  id: string
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function getInitialValues(partner: PartnerDetail): PartnerEditFormValues {
  return {
    name: partner.name,
    websiteUrl: partner.websiteUrl ?? '',
    description: partner.description ?? '',
  }
}

function getDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) return 'Không tìm thấy đối tác.'
    return error.response?.data?.message || 'Không thể tải thông tin đối tác.'
  }

  return 'Không thể tải thông tin đối tác.'
}

function getUpdateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.data?.errors?.code === 'PARTNER_PUBLISHED_CANNOT_EDIT') {
      return 'Đối tác đang được đăng. Hãy gỡ đăng thành công trước khi chỉnh sửa thông tin.'
    }

    return error.response?.data?.message || 'Không thể cập nhật đối tác. Vui lòng thử lại.'
  }

  return 'Không thể cập nhật đối tác. Vui lòng thử lại.'
}

function PartnerEditSkeleton() {
  return (
    <section className="partner-edit partner-edit--loading" aria-label="Đang tải thông tin đối tác">
      <Skeleton className="partner-edit__skeleton-breadcrumb" />
      <Skeleton className="partner-edit__skeleton-title" />
      <Skeleton className="partner-edit__skeleton-card" />
      <Skeleton className="partner-edit__skeleton-form" />
    </section>
  )
}

function EditPartnerContent({ partner }: { partner: PartnerDetail }) {
  const navigate = useNavigate()
  const unpublishConfirmation = useOverlayState()
  const updatePartner = useUpdatePartner(partner.id)
  const [savedPartner, setSavedPartner] = useState(partner)
  const [selectedLogo, setSelectedLogo] = useState<File | undefined>()
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<PartnerEditFormValues>({ defaultValues: getInitialValues(partner) })

  const name = useWatch({ control, name: 'name' })
  const isLocked = savedPartner.isPublished
  const profileDirty = isDirty || Boolean(selectedLogo)

  function applySuccessfulUpdate(updated: PartnerDetail) {
    setSavedPartner(updated)
    setSelectedLogo(undefined)
    reset(getInitialValues(updated))
    clearErrors()
  }

  async function confirmUnpublish() {
    clearErrors('root')

    try {
      const updated = await updatePartner.mutateAsync({ isPublished: false })
      applySuccessfulUpdate(updated)
      unpublishConfirmation.close()
    } catch (error: unknown) {
      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  async function save(values: PartnerEditFormValues) {
    if (isLocked) return

    const trimmedName = values.name.trim()
    clearErrors('root')

    if (!trimmedName) {
      setError('name', { type: 'manual', message: 'Tên đối tác là bắt buộc.' })
      return
    }

    if (trimmedName.length > 200) {
      setError('name', { type: 'manual', message: 'Tên đối tác không được vượt quá 200 ký tự.' })
      return
    }

    const payload: UpdatePartnerProfileRequest = {
      name: trimmedName,
      logoUrl: savedPartner.logoUrl,
      websiteUrl: toNullableString(values.websiteUrl),
      description: toNullableString(values.description),
      ...(selectedLogo ? { logo: selectedLogo } : {}),
    }

    try {
      const updated = await updatePartner.mutateAsync(payload)
      applySuccessfulUpdate(updated)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        const fields = error.response?.data?.errors?.fields ?? []
        if (fields.includes('name')) {
          setError('name', {
            type: 'server',
            message: error.response?.data?.message || 'Tên đối tác không hợp lệ.',
          })
          return
        }
      }

      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  async function publish() {
    clearErrors('root')

    if (profileDirty) {
      setError('root', {
        type: 'validation',
        message: 'Thông tin chỉnh sửa chưa được lưu. Vui lòng lưu trước khi đăng.',
      })
      return
    }

    try {
      const updated = await updatePartner.mutateAsync({ isPublished: true })
      applySuccessfulUpdate(updated)
    } catch (error: unknown) {
      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  return (
    <section className="partner-edit">
      <nav className="partner-edit__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.PARTNERS} state={{ partnerNavigation: 'back-to-list' }}>Đối tác</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <Link to={ROUTE_PATHS.PARTNER_DETAIL.replace(':id', partner.id)}>Chi tiết đối tác</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chỉnh sửa đối tác</span>
      </nav>

      <div className="partner-edit__toolbar" aria-label="Thao tác chỉnh sửa đối tác">
        <Button
          className="partner-edit__cancel"
          type="button"
          variant="secondary"
          isDisabled={updatePartner.isPending}
          onClick={() => navigate(ROUTE_PATHS.PARTNER_DETAIL.replace(':id', partner.id))}
        >
          Hủy
        </Button>
        <Button
          className="partner-edit__submit"
          type="submit"
          form="partner-edit-form"
          variant="primary"
          isDisabled={!profileDirty || updatePartner.isPending || isLocked}
        >
          {updatePartner.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      <div className="partner-edit__sheet">
        <section className="partner-edit__summary-card">
          <PartnerLogoPreview src={savedPartner.logoUrl} alt={`Logo ${name || partner.name}`} compact />
          <label className="partner-edit__summary-name">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <input
                  {...field}
                  form="partner-edit-form"
                  aria-label="Tên đối tác"
                  maxLength={200}
                  disabled={isLocked || updatePartner.isPending}
                />
              )}
            />
            {errors.name && <small role="alert">{errors.name.message}</small>}
          </label>
          <div className="partner-edit__publish-control">
            <button
              className={`partner-edit__publish-toggle ${isLocked ? 'is-on' : 'is-off'}`}
              type="button"
              aria-label={isLocked ? 'Gỡ đăng' : 'Đăng'}
              aria-pressed={isLocked}
              disabled={updatePartner.isPending}
              onClick={() => {
                if (isLocked) {
                  unpublishConfirmation.open()
                  return
                }

                void publish()
              }}
            >
              <span>{isLocked ? 'Đã đăng' : 'Chưa đăng'}</span>
              <span className="partner-edit__publish-toggle-track" aria-hidden="true">
                <span className="partner-edit__publish-toggle-thumb" />
              </span>
            </button>
          </div>
        </section>

        {isLocked ? (
          <div className="partner-edit__locked-note">
            Đối tác đang được đăng. Hãy gỡ đăng trước; sau đó mới có thể chỉnh sửa thông tin và logo.
          </div>
        ) : null}

        <form id="partner-edit-form" className="partner-edit__form" onSubmit={handleSubmit(save)} noValidate>
          <div className="partner-edit__content-grid">
            <div className="partner-edit__content-column">
              <label className="partner-edit__field">
                <span>Website URL</span>
                <Controller
                  control={control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="url"
                      placeholder="https://website-doi-tac.vn"
                      disabled={isLocked || updatePartner.isPending}
                    />
                  )}
                />
              </label>

              <label className="partner-edit__field partner-edit__description-field">
                <span>Description</span>
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={8}
                      placeholder="Nhập thông tin giới thiệu đối tác."
                      disabled={isLocked || updatePartner.isPending}
                    />
                  )}
                />
              </label>
            </div>

            <PartnerLogoUpload
              currentUrl={savedPartner.logoUrl}
              file={selectedLogo}
              disabled={isLocked || updatePartner.isPending}
              onFileChange={setSelectedLogo}
            />
          </div>

          {errors.root && (
            <p className="partner-edit__form-error" role="alert">
              {errors.root.message}
            </p>
          )}
        </form>
      </div>

      <Modal.Root state={unpublishConfirmation}>
        <Modal.Backdrop className="partner-edit__unpublish-backdrop" isDismissable={!updatePartner.isPending}>
          <Modal.Container className="partner-edit__unpublish-container" placement="center" size="md">
            <Modal.Dialog className="partner-edit__unpublish-dialog">
              <Modal.Header className="partner-edit__unpublish-header">
                <Modal.Heading className="partner-edit__unpublish-heading">Gỡ đăng đối tác?</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="partner-edit__unpublish-body">
                <p>Đối tác sẽ được gỡ khỏi website công khai và đưa về trạng thái chưa đăng.</p>
              </Modal.Body>
              <Modal.Footer className="partner-edit__unpublish-footer">
                <Button type="button" variant="outline" isDisabled={updatePartner.isPending} onClick={unpublishConfirmation.close}>
                  Hủy
                </Button>
                <Button type="button" variant="primary" isDisabled={updatePartner.isPending} onClick={() => void confirmUnpublish()}>
                  {updatePartner.isPending ? 'Đang gỡ đăng...' : 'Xác nhận'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </section>
  )
}

export function EditPartnerForm({ id }: EditPartnerFormProps) {
  const partnerQuery = usePartnerDetail(id)

  if (partnerQuery.isPending) return <PartnerEditSkeleton />

  if (!partnerQuery.data || partnerQuery.error) {
    return (
      <section className="partner-edit__error">
        <h1>Không thể mở đối tác</h1>
        <p>{getDetailErrorMessage(partnerQuery.error)}</p>
        <Button type="button" variant="primary" onClick={() => void partnerQuery.refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  return <EditPartnerContent key={`${partnerQuery.data.id}:${partnerQuery.data.isPublished}`} partner={partnerQuery.data} />
}
