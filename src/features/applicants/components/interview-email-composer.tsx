import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Modal, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, Eye, Monitor, Send, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'

import { EmailRichTextEditor } from '@/features/applicants/components/email-rich-text-editor'
import { InterviewDatePicker } from '@/features/applicants/components/interview-date-picker'
import { useInterviewInvitationTemplate } from '@/features/applicants/hooks/use-interview-invitation-template'
import { useSendInterviewInvitations } from '@/features/applicants/hooks/use-send-interview-invitations'
import {
  interviewInvitationFormSchema,
  type InterviewInvitationFormValues,
} from '@/features/applicants/schemas/interview-invitation.schema'
import type {
  JobApplicationListItem,
  SendInterviewInvitationsRequest,
  SendInterviewInvitationsResult,
} from '@/features/applicants/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { buildInterviewInvitationPreviewHtml } from '@/features/applicants/utils/render-interview-invitation-preview'

type InterviewEmailComposerProps = {
  selectedApplicants: JobApplicationListItem[]
  onCancel: () => void
  onBatchInvalid: () => void
}

type PreviewViewport = 'desktop' | 'mobile'

type ApiErrorInfo = {
  code: string | null
  message: string
  fields: string[]
}

type PreviewPositionGroup = {
  jobPostId: string
  positionTitle: string
  applicants: JobApplicationListItem[]
}

const defaultValues: InterviewInvitationFormValues = {
  interviewDate: '',
  interviewTime: '',
  durationMinutes: 30,
  interviewMode: 'Onsite',
  location: '',
  locationUrl: '',
  interviewInformationHtml: '',
  agendaHtml: '',
  preparationHtml: '',
}

const formFieldNames = new Set<FieldPath<InterviewInvitationFormValues>>([
  'interviewDate',
  'interviewTime',
  'durationMinutes',
  'interviewMode',
  'location',
  'locationUrl',
  'interviewInformationHtml',
  'agendaHtml',
  'preparationHtml',
])

function hasVisibleRichText(value: string): boolean {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0
}

function groupApplicantsByPosition(applicants: JobApplicationListItem[]): PreviewPositionGroup[] {
  const groups = new Map<string, PreviewPositionGroup>()

  for (const applicant of applicants) {
    const positionTitle = applicant.jobPostSnapshotTitle ?? applicant.jobPostTitle
    const group = groups.get(applicant.jobPostId)

    if (group) {
      group.applicants.push(applicant)
      continue
    }

    groups.set(applicant.jobPostId, {
      jobPostId: applicant.jobPostId,
      positionTitle,
      applicants: [applicant],
    })
  }

  return Array.from(groups.values())
}

function buildSendPayload(
  values: InterviewInvitationFormValues,
  applicationIds: string[],
): SendInterviewInvitationsRequest {
  const supplemental = hasVisibleRichText(values.interviewInformationHtml)
    ? values.interviewInformationHtml
    : undefined

  return {
    applicationIds,
    interviewDate: values.interviewDate,
    interviewTime: values.interviewTime,
    durationMinutes: values.durationMinutes,
    interviewMode: values.interviewMode,
    ...(values.interviewMode === 'Onsite' ? { location: values.location.trim() } : {}),
    locationUrl: values.locationUrl.trim(),
    ...(supplemental ? { interviewInformationHtml: supplemental } : {}),
    agendaHtml: values.agendaHtml,
    preparationHtml: values.preparationHtml,
  }
}

function getApiError(error: unknown, fallback: string): ApiErrorInfo {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return { code: null, message: fallback, fields: [] }
  }

  const code = error.response?.data?.errors?.code ?? null
  const fields = error.response?.data?.errors?.fields ?? []
  const message = error.response?.data?.message || fallback

  switch (code) {
    case 'JOB_APPLICATION_INTERVIEW_TIME_INVALID':
      return {
        code,
        fields,
        message: 'Thời gian phỏng vấn phải lớn hơn thời điểm hiện tại theo giờ Việt Nam.',
      }
    case 'JOB_APPLICATION_INTERVIEW_BATCH_INVALID':
      return {
        code,
        fields,
        message: 'Danh sách ứng viên đã thay đổi. Tất cả hồ sơ trong batch phải đang ở trạng thái Đã duyệt.',
      }
    case 'JOB_APPLICATION_INTERVIEW_CONTENT_INVALID':
      return { code, fields, message: message || 'Nội dung email phỏng vấn chưa hợp lệ.' }
    case 'JOB_APPLICATION_INTERVIEW_PERSIST_FAILED':
      return {
        code,
        fields,
        message:
          'Email có thể đã được gửi nhưng hệ thống chưa lưu được trạng thái. Không tự động gửi lại; vui lòng kiểm tra trước khi thao tác tiếp.',
      }
    default:
      return { code, fields, message }
  }
}

function formatInterviewAt(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

export function InterviewEmailComposer({
  selectedApplicants,
  onCancel,
  onBatchInvalid,
}: InterviewEmailComposerProps) {
  const invitationTemplate = useInterviewInvitationTemplate()
  const sendInvitations = useSendInterviewInvitations()
  const closeConfirmation = useOverlayState()
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<SendInterviewInvitationsResult | null>(null)
  const [resultApplicantNames, setResultApplicantNames] = useState<Record<string, string>>({})

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<InterviewInvitationFormValues>({
    resolver: zodResolver(interviewInvitationFormSchema),
    defaultValues,
  })

  const watchedValues = useWatch({ control })
  const interviewMode = useWatch({ control, name: 'interviewMode' })
  const applicationIds = useMemo(() => selectedApplicants.map((item) => item.id), [selectedApplicants])
  const previewPositionGroups = useMemo(() => groupApplicantsByPosition(selectedApplicants), [selectedApplicants])
  const previewApplicant = selectedApplicants[0]
  const previewHtml = useMemo(
    () =>
      invitationTemplate.data && previewApplicant
        ? buildInterviewInvitationPreviewHtml({
            template: invitationTemplate.data,
            applicant: previewApplicant,
            values: watchedValues,
          })
        : null,
    [invitationTemplate.data, previewApplicant, watchedValues],
  )
  const isBusy = sendInvitations.isPending

  function applyServerFieldErrors(errorInfo: ApiErrorInfo) {
    for (const field of errorInfo.fields) {
      if (!formFieldNames.has(field as FieldPath<InterviewInvitationFormValues>)) continue
      setError(field as FieldPath<InterviewInvitationFormValues>, {
        type: 'server',
        message: errorInfo.message,
      })
    }
  }

  function resetComposer() {
    reset(defaultValues)
    sendInvitations.reset()
    setPreviewViewport('desktop')
    setFormError(null)
    setResult(null)
    setResultApplicantNames({})
  }

  function closeComposer() {
    if (isBusy) return
    if (!result && isDirty) {
      closeConfirmation.open()
      return
    }

    resetComposer()
    onCancel()
  }

  function confirmClose() {
    if (isBusy) return
    closeConfirmation.close()
    resetComposer()
    onCancel()
  }

  const sendSubmit = handleSubmit(async (values) => {
    if (applicationIds.length === 0 || isBusy) return

    if (!invitationTemplate.data) {
      setFormError('Chưa tải được template email. Vui lòng thử lại.')
      return
    }

    clearErrors()
    setFormError(null)

    try {
      const applicantNames = Object.fromEntries(selectedApplicants.map((item) => [item.id, item.fullName]))
      const response = await sendInvitations.mutateAsync(buildSendPayload(values, applicationIds))
      setResultApplicantNames(applicantNames)
      setResult(response)
    } catch (error: unknown) {
      const errorInfo = getApiError(error, 'Không thể gửi email phỏng vấn.')
      applyServerFieldErrors(errorInfo)

      if (errorInfo.code === 'JOB_APPLICATION_INTERVIEW_BATCH_INVALID') {
        onBatchInvalid()
      }

      setFormError(errorInfo.message)
    }
  })

  return (
    <section className="interview-invitation-page interview-composer">
      <header className="interview-invitation-page__header">
        <div>
          <h1>{result ? 'Kết quả gửi thư mời' : 'Gửi email mời phỏng vấn'}</h1>
        </div>
        <div className="interview-invitation-page__actions">
          <Button
            className="interview-invitation-page__action interview-invitation-page__action--cancel"
            type="button"
            variant="outline"
            isDisabled={isBusy}
            onClick={closeComposer}
          >
            {result ? 'Xong' : 'Hủy'}
          </Button>

          {!result && (
            <Button
              className="interview-invitation-page__action interview-invitation-page__action--submit"
              type="button"
              variant="primary"
              isDisabled={isBusy || !invitationTemplate.data || applicationIds.length === 0}
              onClick={() => void sendSubmit()}
            >
              <Send size={15} aria-hidden="true" />
              {sendInvitations.isPending ? 'Đang gửi...' : 'Gửi ngay'}
            </Button>
          )}
        </div>
      </header>

      {!result && (
        <div className="interview-invitation-page__recipients">
          <div className="interview-invitation-page__recipient-list">
            {selectedApplicants.map((applicant) => (
              <div className="interview-invitation-page__recipient-card" key={applicant.id}>
                <strong title={applicant.fullName}>{applicant.fullName}</strong>
              </div>
            ))}
          </div>
          <div className="interview-invitation-page__recipient-count-card">
            <strong>{selectedApplicants.length}</strong>
            <span>Ứng viên đã chọn</span>
          </div>
        </div>
      )}

      <main className="interview-invitation-page__content interview-composer__body">
              {result ? (
                <div className="interview-composer__result" role="status">
                  <div className="interview-composer__result-summary">
                    <div>
                      <span>Tổng xử lý</span>
                      <strong>{result.totalRequested}</strong>
                    </div>
                    <div>
                      <span>Thành công</span>
                      <strong>{result.sentCount}</strong>
                    </div>
                    <div>
                      <span>Thất bại</span>
                      <strong>{result.failedCount}</strong>
                    </div>
                  </div>

                  <div className="interview-composer__result-list">
                    {result.results.map((item) => (
                      <div className={`interview-composer__result-row is-${item.outcome.toLowerCase()}`} key={item.applicationId}>
                        <div>
                          <strong>{resultApplicantNames[item.applicationId] ?? item.applicationId}</strong>
                          <span>{item.outcome === 'Sent' ? 'Đã gửi email' : 'Gửi email thất bại'}</span>
                        </div>
                        <div>
                          <span>{item.status}</span>
                          <small>{formatInterviewAt(item.interviewAt)}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.failedCount > 0 && (
                    <p className="interview-composer__result-note">
                      Hồ sơ gửi thất bại vẫn giữ trạng thái Đã duyệt và chưa lưu lịch phỏng vấn.
                    </p>
                  )}
                </div>
              ) : (
                <div className="interview-composer__layout">
                  <div className="interview-composer__form-pane interview-composer__form-card">
                    <section className="interview-composer__section">
                      <div className="interview-composer__section-heading">
                        <strong>Thông tin buổi phỏng vấn</strong>
                      </div>

                      <div className="interview-composer__form-grid">
                        <label className="interview-composer__field">
                          <span>Ngày phỏng vấn</span>
                          <Controller
                            control={control}
                            name="interviewDate"
                            render={({ field }) => (
                              <InterviewDatePicker
                                value={field.value}
                                disabled={isBusy}
                                invalid={Boolean(errors.interviewDate)}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            )}
                          />
                          {errors.interviewDate && <small>{errors.interviewDate.message}</small>}
                        </label>

                        <label className="interview-composer__field">
                          <span>Giờ phỏng vấn</span>
                          <input type="time" disabled={isBusy} aria-invalid={Boolean(errors.interviewTime)} {...register('interviewTime')} />
                          {errors.interviewTime && <small>{errors.interviewTime.message}</small>}
                        </label>

                        <label className="interview-composer__field">
                          <span>Thời lượng (phút)</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            disabled={isBusy}
                            aria-invalid={Boolean(errors.durationMinutes)}
                            {...register('durationMinutes', { valueAsNumber: true })}
                          />
                          {errors.durationMinutes && <small>{errors.durationMinutes.message}</small>}
                        </label>

                        <label className="interview-composer__field">
                          <span>Hình thức</span>
                          <select disabled={isBusy} aria-invalid={Boolean(errors.interviewMode)} {...register('interviewMode')}>
                            <option value="Onsite">Trực tiếp tại văn phòng</option>
                            <option value="Online">Online</option>
                          </select>
                          {errors.interviewMode && <small>{errors.interviewMode.message}</small>}
                        </label>

                        {interviewMode === 'Onsite' && (
                          <label className="interview-composer__field interview-composer__field--wide">
                            <span>Địa điểm</span>
                            <input
                              type="text"
                              maxLength={500}
                              placeholder="Nhập địa chỉ phỏng vấn"
                              disabled={isBusy}
                              aria-invalid={Boolean(errors.location)}
                              {...register('location')}
                            />
                            {errors.location && <small>{errors.location.message}</small>}
                          </label>
                        )}

                        <label className="interview-composer__field interview-composer__field--wide">
                          <span>{interviewMode === 'Online' ? 'Link họp' : 'Link bản đồ'}</span>
                          <input
                            type="url"
                            placeholder="https://..."
                            disabled={isBusy}
                            aria-invalid={Boolean(errors.locationUrl)}
                            {...register('locationUrl')}
                          />
                          {errors.locationUrl && <small>{errors.locationUrl.message}</small>}
                        </label>
                      </div>

                      <Controller
                        control={control}
                        name="interviewInformationHtml"
                        render={({ field }) => (
                          <div className="interview-composer__rich-field">
                            <div>
                              <strong>Thông tin bổ sung</strong>
                            </div>
                            <EmailRichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={isBusy}
                              ariaLabel="Thông tin bổ sung cho buổi phỏng vấn"
                              placeholder="Nhập thông tin bổ sung nếu cần..."
                            />
                            {errors.interviewInformationHtml && <small className="interview-composer__field-error">{errors.interviewInformationHtml.message}</small>}
                          </div>
                        )}
                      />
                    </section>

                    <section className="interview-composer__section">
                      <div className="interview-composer__section-heading">
                        <strong>Nội dung buổi phỏng vấn</strong>
                      </div>
                      <Controller
                        control={control}
                        name="agendaHtml"
                        render={({ field }) => (
                          <div className="interview-composer__rich-field">
                            <EmailRichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={isBusy}
                              ariaLabel="Nội dung buổi phỏng vấn"
                              placeholder="Ví dụ: Giới thiệu bản thân, trao đổi chuyên môn, hỏi đáp..."
                            />
                            {errors.agendaHtml && <small className="interview-composer__field-error">{errors.agendaHtml.message}</small>}
                          </div>
                        )}
                      />
                    </section>

                    <section className="interview-composer__section">
                      <div className="interview-composer__section-heading">
                        <strong>Bạn cần chuẩn bị</strong>
                      </div>
                      <Controller
                        control={control}
                        name="preparationHtml"
                        render={({ field }) => (
                          <div className="interview-composer__rich-field">
                            <EmailRichTextEditor
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={isBusy}
                              ariaLabel="Nội dung ứng viên cần chuẩn bị"
                              placeholder="Ví dụ: CV cập nhật, portfolio nếu có..."
                            />
                            {errors.preparationHtml && <small className="interview-composer__field-error">{errors.preparationHtml.message}</small>}
                          </div>
                        )}
                      />
                    </section>
                  </div>

                  <aside className="interview-composer__preview-pane">
                    <div className="interview-composer__preview-header">
                      <div>
                        <strong>Xem trước email</strong>
                      </div>
                      <div className="interview-composer__viewport-toggle" aria-label="Kích thước xem trước">
                        <button
                          type="button"
                          className={previewViewport === 'desktop' ? 'is-active' : ''}
                          aria-label="Xem Desktop"
                          title="Desktop"
                          onClick={() => setPreviewViewport('desktop')}
                        >
                          <Monitor size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className={previewViewport === 'mobile' ? 'is-active' : ''}
                          aria-label="Xem Mobile"
                          title="Mobile"
                          onClick={() => setPreviewViewport('mobile')}
                        >
                          <Smartphone size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {previewHtml && previewApplicant ? (
                      <div className="interview-composer__preview">
                        <div className="interview-composer__preview-position-summary">
                          <span className="interview-composer__preview-position-label">Vị trí</span>
                          <div className="interview-composer__preview-position-list">
                            {previewPositionGroups.map((group) => (
                              <div className="interview-composer__preview-position-group" key={group.jobPostId}>
                                <strong className="interview-composer__preview-position-title">{group.positionTitle}</strong>
                                {group.applicants.map((applicant) => (
                                  <span className="interview-composer__preview-applicant-card" key={applicant.id}>
                                    {applicant.fullName}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={`interview-composer__preview-frame-wrap is-${previewViewport}`}>
                          <iframe
                            title={`Xem trước email gửi ${previewApplicant.fullName}`}
                            srcDoc={previewHtml}
                            sandbox=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="interview-composer__preview-empty">
                        <Eye size={22} aria-hidden="true" />
                        <strong>{invitationTemplate.isError ? 'Không thể tải template email' : 'Đang tải template email'}</strong>
                        <span>
                          {invitationTemplate.isError
                            ? 'Vui lòng thử tải lại template trước khi gửi email.'
                            : 'Bản xem trước sẽ cập nhật ngay khi template sẵn sàng.'}
                        </span>
                        {invitationTemplate.isError && (
                          <Button type="button" variant="outline" onClick={() => void invitationTemplate.refetch()}>
                            Thử lại
                          </Button>
                        )}
                      </div>
                    )}
                  </aside>
                </div>
              )}

              {formError && !result && (
                <div className="applicant-list__modal-error interview-composer__error" role="alert">
                  {formError}
                </div>
              )}
      </main>

      <Modal.Root state={closeConfirmation}>
        <Modal.Backdrop className="applicant-review-confirm__backdrop" isDismissable={!isBusy}>
          <Modal.Container className="applicant-review-confirm__container" placement="center" size="md">
            <Modal.Dialog className="applicant-review-confirm__dialog">
              <Modal.Header className="applicant-review-confirm__header">
                <Modal.Icon className="applicant-review-confirm__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <Modal.Heading className="applicant-review-confirm__heading">
                  Rời khỏi trang?
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="applicant-review-confirm__body">
                <p>Nội dung chưa gửi sẽ bị mất. Bạn có chắc muốn rời khỏi trang?</p>
              </Modal.Body>
              <Modal.Footer className="applicant-review-confirm__footer">
                <Button type="button" variant="outline" isDisabled={isBusy} onClick={() => closeConfirmation.close()}>
                  Ở lại
                </Button>
                <Button
                  className="applicant-review-confirm__reject"
                  type="button"
                  variant="primary"
                  isDisabled={isBusy}
                  onClick={confirmClose}
                >
                  Rời khỏi
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

    </section>
  )
}
