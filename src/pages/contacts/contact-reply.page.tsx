import { Button, Skeleton } from '@heroui/react'
import axios from 'axios'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { ContactEmailComposer } from '@/features/contacts/components/contact-email-composer'
import { useContactDetail } from '@/features/contacts/hooks/use-contact-detail'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tải thông tin liên hệ.'
  }

  return 'Không thể tải thông tin liên hệ.'
}

export function ContactReplyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const detail = useContactDetail(id ?? '')

  if (!id) return <Navigate to={ROUTE_PATHS.CONTACTS} replace />

  if (detail.isPending) {
    return (
      <section className="contact-reply-page contact-reply-page--loading" aria-label="Đang tải trang phản hồi">
        <Skeleton className="contact-reply-page__skeleton-title" />
        <Skeleton className="contact-reply-page__skeleton-content" />
      </section>
    )
  }

  if (!detail.data || detail.error) {
    return (
      <section className="contact-reply-page__error-state">
        <h1>Phản hồi khách hàng</h1>
        <p>{getErrorMessage(detail.error)}</p>
        <div>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTE_PATHS.CONTACTS)}>Quay lại</Button>
          <Button type="button" variant="primary" onClick={() => void detail.refetch()}>Thử lại</Button>
        </div>
      </section>
    )
  }

  return <ContactEmailComposer contact={detail.data} onCancel={() => navigate(ROUTE_PATHS.CONTACTS)} />
}
