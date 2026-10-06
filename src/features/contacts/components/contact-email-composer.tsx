import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Chip, Modal, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, Eye, Mail, Monitor, Send, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'

import { ContactEmailRichTextEditor } from '@/features/contacts/components/contact-email-rich-text-editor'
import { useContactReplyTemplate } from '@/features/contacts/hooks/use-contact-reply-template'
import { useSendContactReply } from '@/features/contacts/hooks/use-send-contact-reply'
import {
  CONTACT_REPLY_SUBJECT_MAX_LENGTH,
  contactReplyFormSchema,
  isRichTextEmpty,
  type ContactReplyFormValues,
} from '@/features/contacts/schemas/contact-reply.schema'
import type { ContactDetail, SendContactReplyRequest } from '@/features/contacts/types'
import { renderContactReplyPreview } from '@/features/contacts/utils/render-contact-reply-preview'
import type { ApiResponse } from '@/lib/http/api-response'

type ContactEmailComposerProps = {
  contact: ContactDetail
  onCancel: () => void
}

type PreviewViewport = 'desktop' | 'mobile'

type ReplyErrorInfo = {
  code: string | null
  fields: string[]
  message: string
}

const defaultValues: ContactReplyFormValues = {
  subject: '',
  body: '',
  proposalHtml: '',
  nextStepsHtml: '',
}

const formFieldNames = new Set<FieldPath<ContactReplyFormValues>>([
  'subject',
  'body',
  'proposalHtml',
  'nextStepsHtml',
])

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getReplyErrorInfo(error: unknown, fallback: string): ReplyErrorInfo {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) return { code: null, fields: [], message: fallback }

  const response = error.response?.data
  const code = response?.errors?.code ?? null
  const fields = response?.errors?.fields ?? []
  const message = response?.message || fallback

  switch (code) {
    case 'CONTACT_REPLY_VALIDATION_ERROR':
      return { code, fields, message: message || 'Tiêu đề và nội dung email không hợp lệ.' }
    case 'CONTACT_ALREADY_CONTACTED':
      return { code, fields, message: 'Liên hệ này đã được phản hồi và không thể gửi lần hai.' }
    case 'CONTACT_REPLY_TEMPLATE_READ_FAILED':
      return { code, fields, message: 'Không thể tải mẫu email. Vui lòng thử lại.' }
    case 'CONTACT_REPLY_READ_FAILED':
      return { code, fields, message: 'Không thể đọc dữ liệu liên hệ để gửi email. Vui lòng thử lại.' }
    case 'CONTACT_EMAIL_SEND_FAILED':
      return { code, fields, message: 'Không thể gửi email phản hồi qua hệ thống mail. Vui lòng thử lại.' }
    case 'CONTACT_REPLY_UPDATE_FAILED':
      return { code, fields, message: `${message} Email có thể đã được gửi; hệ thống sẽ không tự động gửi lại.` }
    default:
      return { code, fields, message }
  }
}

function buildPayload(values: ContactReplyFormValues): SendContactReplyRequest {
  const proposalHtml = isRichTextEmpty(values.proposalHtml) ? undefined : values.proposalHtml.trim()
  const nextStepsHtml = isRichTextEmpty(values.nextStepsHtml) ? undefined : values.nextStepsHtml.trim()

  return {
    subject: values.subject.trim(),
    body: values.body.trim(),
    ...(proposalHtml ? { proposalHtml } : {}),
    ...(nextStepsHtml ? { nextStepsHtml } : {}),
  }
}

export function ContactEmailComposer({ contact, onCancel }: ContactEmailComposerProps) {
  const template = useContactReplyTemplate()
  const sendReply = useSendContactReply(contact.id)
  const closeConfirmation = useOverlayState()
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop')
  const [formError, setFormError] = useState<string | null>(null)
  const [sendCompleted, setSendCompleted] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ContactReplyFormValues>({
    resolver: zodResolver(contactReplyFormSchema),
    defaultValues,
  })

  const watchedValues = useWatch({ control })
  const values: ContactReplyFormValues = {
    subject: watchedValues.subject ?? '',
    body: watchedValues.body ?? '',
    proposalHtml: watchedValues.proposalHtml ?? '',
    nextStepsHtml: watchedValues.nextStepsHtml ?? '',
  }
  const previewHtml = useMemo(
    () => (template.data
      ? renderContactReplyPreview(template.data, contact, {
          subject: watchedValues.subject ?? '',
          body: watchedValues.body ?? '',
          proposalHtml: watchedValues.proposalHtml ?? '',
          nextStepsHtml: watchedValues.nextStepsHtml ?? '',
        })
      : ''),
    [contact, template.data, watchedValues.body, watchedValues.nextStepsHtml, watchedValues.proposalHtml, watchedValues.subject],
  )
  const isBusy = sendReply.isPending

  function applyServerFieldErrors(errorInfo: ReplyErrorInfo) {
    for (const field of errorInfo.fields) {
      if (!formFieldNames.has(field as FieldPath<ContactReplyFormValues>)) continue
      setError(field as FieldPath<ContactReplyFormValues>, { type: 'server', message: errorInfo.message })
    }
  }

  function handleCancel() {
    if (isBusy) return
    if (isDirty) {
      closeConfirmation.open()
      return
    }
    onCancel()
  }

  function confirmClose() {
    if (isBusy) return
    closeConfirmation.close()
    onCancel()
  }

  const submit = handleSubmit(async (formValues) => {
    if (isBusy || !contact.canSendEmail || !template.data) return

    clearErrors()
    setFormError(null)

    try {
      await sendReply.mutateAsync(buildPayload(formValues))
      setSendCompleted(true)
    } catch (error: unknown) {
      const errorInfo = getReplyErrorInfo(error, 'Không thể gửi email phản hồi.')
      applyServerFieldErrors(errorInfo)
      if (errorInfo.code === 'CONTACT_ALREADY_CONTACTED') {
        setFormError(errorInfo.message)
        return
      }
      setFormError(errorInfo.message)
    }
  })

  return (
    <section className="contact-reply-page" aria-labelledby="contact-reply-title">
      <header className="contact-reply-page__header">
        <div>
          <h1 id="contact-reply-title">Phản hồi khách hàng</h1>
        </div>
        <div className="contact-reply-page__actions">
          <Button
            className="contact-reply-page__action contact-reply-page__action--cancel"
            type="button"
            variant="outline"
            isDisabled={isBusy}
            onClick={handleCancel}
          >
            Hủy
          </Button>
          <Button
            className="contact-reply-page__action contact-reply-page__action--submit"
            type="button"
            variant="primary"
            isDisabled={isBusy || !contact.canSendEmail || !template.data || sendCompleted}
            onClick={() => void submit()}
          >
            <Send size={15} aria-hidden="true" />
            {sendReply.isPending ? 'Đang gửi…' : sendCompleted ? 'Đã gửi' : 'Gửi phản hồi'}
          </Button>
        </div>
      </header>

      <div className="contact-reply-page__recipient">
        <span className="contact-reply-page__avatar" aria-hidden="true">{getInitials(contact.fullName)}</span>
        <div>
          <strong>{contact.fullName}</strong>
          <span>{contact.email}</span>
        </div>
        <Chip size="sm" variant="secondary">{contact.contactStatus}</Chip>
      </div>

      {!contact.canSendEmail && (
        <div className="contact-reply-page__notice" role="status">
          Liên hệ này đã được phản hồi. Không thể gửi email lần hai.
        </div>
      )}

      <form className="contact-reply-page__content" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <div className="contact-reply-page__layout">
          <div className="contact-reply-page__form-pane">
            <label className="contact-reply-page__field">
              <span>Tiêu đề email *</span>
              <input
                type="text"
                maxLength={CONTACT_REPLY_SUBJECT_MAX_LENGTH}
                placeholder="Nhập tiêu đề email"
                disabled={isBusy || !contact.canSendEmail}
                aria-invalid={Boolean(errors.subject)}
                {...register('subject')}
              />
              {errors.subject && <small className="contact-reply-page__field-error">{errors.subject.message}</small>}
            </label>

            <section className="contact-reply-page__section">
              <h2>Nội dung phản hồi *</h2>
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <ContactEmailRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isBusy || !contact.canSendEmail}
                    ariaLabel="Nội dung phản hồi"
                    placeholder="Nhập nội dung phản hồi..."
                  />
                )}
              />
              {errors.body && <small className="contact-reply-page__field-error">{errors.body.message}</small>}
            </section>

            <section className="contact-reply-page__section">
              <h2>Phương án đề xuất</h2>
              <Controller
                control={control}
                name="proposalHtml"
                render={({ field }) => (
                  <ContactEmailRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isBusy || !contact.canSendEmail}
                    ariaLabel="Phương án đề xuất"
                    placeholder="Nhập phương án đề xuất nếu cần..."
                  />
                )}
              />
              {errors.proposalHtml && <small className="contact-reply-page__field-error">{errors.proposalHtml.message}</small>}
            </section>

            <section className="contact-reply-page__section">
              <h2>Bước tiếp theo</h2>
              <Controller
                control={control}
                name="nextStepsHtml"
                render={({ field }) => (
                  <ContactEmailRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isBusy || !contact.canSendEmail}
                    ariaLabel="Bước tiếp theo"
                    placeholder="Nhập bước tiếp theo nếu cần..."
                  />
                )}
              />
              {errors.nextStepsHtml && <small className="contact-reply-page__field-error">{errors.nextStepsHtml.message}</small>}
            </section>
          </div>

          <aside className="contact-reply-page__preview-pane">
            <div className="contact-reply-page__preview-header">
              <div><h2>Xem trước email</h2><span>{contact.email}</span></div>
              <div className="contact-reply-page__viewport-toggle" aria-label="Kích thước xem trước">
                <button type="button" className={previewViewport === 'desktop' ? 'is-active' : ''} aria-label="Xem Desktop" onClick={() => setPreviewViewport('desktop')}>
                  <Monitor size={15} aria-hidden="true" />
                </button>
                <button type="button" className={previewViewport === 'mobile' ? 'is-active' : ''} aria-label="Xem Mobile" onClick={() => setPreviewViewport('mobile')}>
                  <Smartphone size={15} aria-hidden="true" />
                </button>
              </div>
            </div>

            {template.isPending && <div className="contact-reply-page__preview-empty"><Eye size={22} aria-hidden="true" /><strong>Đang tải mẫu email…</strong></div>}
            {template.error && (
              <div className="contact-reply-page__preview-empty">
                <Mail size={22} aria-hidden="true" />
                <strong>Không thể tải mẫu email</strong>
                <Button type="button" variant="outline" onClick={() => void template.refetch()}>Thử lại</Button>
              </div>
            )}
            {template.data && (
              <>
                <div className="contact-reply-page__preview-subject">
                  <span>Subject</span>
                  <strong>{values.subject || 'Chưa có tiêu đề'}</strong>
                </div>
                <div className={`contact-reply-page__preview-frame-wrap is-${previewViewport}`}>
                  <iframe title={`Xem trước email gửi ${contact.fullName}`} srcDoc={previewHtml} sandbox="" referrerPolicy="no-referrer" />
                </div>
              </>
            )}
          </aside>
        </div>

        {formError && <div className="contact-reply-page__error" role="alert">{formError}</div>}
        {sendCompleted && <div className="contact-reply-page__success" role="status">Email đã được gửi thành công.</div>}

      </form>

      <Modal.Root state={closeConfirmation}>
        <Modal.Backdrop className="contact-reply-page__leave-backdrop" isDismissable={!isBusy}>
          <Modal.Container className="contact-reply-page__leave-container" placement="center" size="md">
            <Modal.Dialog className="contact-reply-page__leave-dialog">
              <Modal.Header className="contact-reply-page__leave-header">
                <Modal.Icon className="contact-reply-page__leave-icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <Modal.Heading className="contact-reply-page__leave-heading">
                  Rời khỏi trang?
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="contact-reply-page__leave-body">
                <p>Nội dung chưa gửi sẽ bị mất. Bạn có chắc muốn rời khỏi trang?</p>
              </Modal.Body>
              <Modal.Footer className="contact-reply-page__leave-footer">
                <Button type="button" variant="outline" isDisabled={isBusy} onClick={() => closeConfirmation.close()}>
                  Ở lại
                </Button>
                <Button
                  className="contact-reply-page__leave-submit"
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
