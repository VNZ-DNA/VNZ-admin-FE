import { Button, Chip } from '@heroui/react'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { PartnerLogoUpload } from '@/features/partners/components/partner-logo-upload'
import { PartnerLogoPreview } from '@/features/partners/components/partner-logo-preview'
import { useCreatePartner } from '@/features/partners/hooks/use-create-partner'
import type { CreatePartnerRequest } from '@/features/partners/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

type PartnerCreateFormValues = {
  name: string
  websiteUrl: string
  description: string
}

const DEFAULT_VALUES: PartnerCreateFormValues = {
  name: '',
  websiteUrl: '',
  description: '',
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function getCreateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tạo đối tác. Vui lòng thử lại.'
  }

  return 'Không thể tạo đối tác. Vui lòng thử lại.'
}

export function CreatePartnerForm() {
  const navigate = useNavigate()
  const createPartner = useCreatePartner()
  const [selectedLogo, setSelectedLogo] = useState<File | undefined>()
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PartnerCreateFormValues>({ defaultValues: DEFAULT_VALUES })
  const name = useWatch({ control, name: 'name' })

  async function create(values: PartnerCreateFormValues) {
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

    const payload: CreatePartnerRequest = {
      name: trimmedName,
      websiteUrl: toNullableString(values.websiteUrl),
      description: toNullableString(values.description),
      ...(selectedLogo ? { logo: selectedLogo } : {}),
    }

    try {
      await createPartner.mutateAsync(payload)
      navigate(ROUTE_PATHS.PARTNERS)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        const code = error.response?.data?.errors?.code
        const fields = error.response?.data?.errors?.fields ?? []

        if (code === 'PARTNER_VALIDATION_FAILED' || fields.includes('name')) {
          setError('name', {
            type: 'server',
            message: error.response?.data?.message || 'Tên đối tác không hợp lệ.',
          })
          return
        }
      }

      setError('root', { type: 'server', message: getCreateErrorMessage(error) })
    }
  }

  return (
    <section className="partner-edit partner-create">
      <nav className="partner-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.PARTNERS}>Đối tác</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Tạo đối tác mới</span>
      </nav>

      <header className="partner-create__heading">
        <div className="partner-create__toolbar">
          <Button
            className="partner-create__action partner-create__action--cancel"
            type="button"
            variant="outline"
            isDisabled={createPartner.isPending}
            onClick={() => navigate(ROUTE_PATHS.PARTNERS)}
          >
            Hủy
          </Button>
          <Button
            className="partner-create__action partner-create__action--submit"
            type="submit"
            form="partner-create-form"
            variant="primary"
            isDisabled={createPartner.isPending}
          >
            {createPartner.isPending ? 'Đang tạo...' : 'Tạo đối tác'}
          </Button>
        </div>
      </header>

      <div className="partner-create__sheet">
        <section className="partner-create__summary-card">
          <div className="partner-create__summary-main">
            <PartnerLogoPreview src={undefined} alt={`Logo ${name?.trim() || 'đối tác mới'}`} compact />
            <div>
              <strong>{name?.trim() || 'Thông tin đối tác'}</strong>
            </div>
          </div>
          <Chip
            className="partner-create__publish-status"
            color="default"
            size="sm"
            variant="secondary"
          >
            Chưa đăng
          </Chip>
        </section>

        <form id="partner-create-form" className="partner-create__form" onSubmit={handleSubmit(create)} noValidate>
          <div className="partner-create__content-grid">
            <div className="partner-create__fields">
              <label className="partner-create__field">
              <span>NAME *</span>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <input
                    {...field}
                    maxLength={200}
                    placeholder="Nhập tên đối tác"
                    autoFocus
                    disabled={createPartner.isPending}
                  />
                )}
              />
              {errors.name && <small role="alert">{errors.name.message}</small>}
              </label>

              <label className="partner-create__field">
              <span>WEBSITE URL</span>
              <Controller
                control={control}
                name="websiteUrl"
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    placeholder="https://website-doi-tac.vn"
                    disabled={createPartner.isPending}
                  />
                )}
              />
              </label>

              <label className="partner-create__field partner-create__description-field">
                <span>DESCRIPTION</span>
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={7}
                      placeholder="Nhập thông tin giới thiệu, lĩnh vực hợp tác và các giá trị nổi bật."
                      disabled={createPartner.isPending}
                    />
                  )}
                />
              </label>
            </div>

            <div className="partner-create__logo-column">
              <PartnerLogoUpload
                currentUrl={null}
                file={selectedLogo}
                disabled={createPartner.isPending}
                onFileChange={setSelectedLogo}
              />
            </div>
          </div>

          {errors.root && (
            <p className="partner-create__form-error" role="alert">
              {errors.root.message}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
