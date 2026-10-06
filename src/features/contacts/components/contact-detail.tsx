import { Button, Chip, Skeleton } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useContactDetail } from '@/features/contacts/hooks/use-contact-detail'
import type { ContactDetail as ContactDetailData } from '@/features/contacts/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function formatDate(value: string): string {
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

function displayValue(value: string | null): string {
  return value?.trim() || '—'
}

function getDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tải chi tiết liên hệ.'
  }

  return 'Không thể tải chi tiết liên hệ.'
}

function ContactDetailSkeleton() {
  return (
    <section className="contact-detail contact-detail--loading" aria-label="Đang tải chi tiết liên hệ">
      <Skeleton className="contact-detail__skeleton-breadcrumb" />
      <Skeleton className="contact-detail__skeleton-summary" />
      <Skeleton className="contact-detail__skeleton-content" />
    </section>
  )
}

type ContactDetailContentProps = {
  contact: ContactDetailData
}

function ContactDetailContent({ contact }: ContactDetailContentProps) {
  const navigate = useNavigate()

  return (
    <section className="contact-detail">
      <nav className="contact-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.CONTACTS} state={{ contactNavigation: 'back-to-list' }}>
          Liên hệ khách hàng
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết liên hệ</span>
      </nav>

      {contact.canSendEmail && (
        <header className="contact-detail__heading contact-detail__heading--actions-only">
          <Button className="contact-detail__action contact-detail__action--reply" type="button" variant="primary" onClick={() => navigate(`/contacts/${contact.id}/reply`)}>
            Phản hồi email
          </Button>
        </header>
      )}

      <div className="contact-detail__sheet">
        <div className="contact-detail__summary-card">
          <span className="contact-detail__avatar" aria-hidden="true">
            {getInitials(contact.fullName)}
          </span>
          <div className="contact-detail__summary-main">
            <strong>{contact.fullName}</strong>
            <span>Gửi lúc {formatDate(contact.createdAt)}</span>
          </div>
          <div className="contact-detail__summary-status">
            <Chip
              className={`contact-detail__status contact-detail__status--${
                contact.contactStatus === 'Đã liên hệ' ? 'contacted' : 'not-contacted'
              }`}
              color="default"
              size="sm"
              variant="secondary"
            >
              {contact.contactStatus}
            </Chip>
          </div>
        </div>

        <section className="contact-detail__section">
          <h2>Thông tin khách hàng</h2>
          <div className="contact-detail__columns">
            <div className="contact-detail__column contact-detail__column--identity">
              <div className="contact-detail__field">
                <span>Họ và tên</span>
                <strong>{contact.fullName}</strong>
              </div>
              <div className="contact-detail__field">
                <span>Email</span>
                <strong>{contact.email}</strong>
              </div>
              <div className="contact-detail__field">
                <span>Điện thoại / Zalo</span>
                <strong>{displayValue(contact.phone)}</strong>
              </div>
            </div>
            <div className="contact-detail__column contact-detail__column--context">
              <div className="contact-detail__field">
                <span>Công ty / Tổ chức</span>
                <strong>{displayValue(contact.companyName)}</strong>
              </div>
              <div className="contact-detail__field">
                <span>Bạn liên hệ về việc gì?</span>
                <strong>{contact.inquiryTopic}</strong>
              </div>
              <div className="contact-detail__field">
                <span>Nguồn biết đến VNZ</span>
                <strong>{displayValue(contact.source)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-detail__section">
          <h2>Nhu cầu dự án</h2>
          <div className="contact-detail__grid">
            <div className="contact-detail__field">
              <span>Ngân sách dự kiến</span>
              <strong>{displayValue(contact.budgetRange)}</strong>
            </div>
            <div className="contact-detail__field">
              <span>Mong muốn bắt đầu</span>
              <strong>{displayValue(contact.expectedStart)}</strong>
            </div>
          </div>
        </section>

        <section className="contact-detail__section">
          <h2>Nội dung</h2>
          <p className="contact-detail__message">{displayValue(contact.message)}</p>
        </section>

      </div>

    </section>
  )
}

type ContactDetailProps = {
  id: string
}

export function ContactDetail({ id }: ContactDetailProps) {
  const queryClient = useQueryClient()
  const { data, error, isPending, refetch } = useContactDetail(id)

  useEffect(() => {
    if (!data) return

    void queryClient.invalidateQueries({ queryKey: ['contacts', 'list'] })
  }, [data, queryClient])

  if (isPending) return <ContactDetailSkeleton />

  if (!data || error) {
    return (
      <section className="contact-detail__error">
        <h1>Chi tiết liên hệ</h1>
        <p>{getDetailErrorMessage(error)}</p>
        <Button type="button" variant="primary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  return <ContactDetailContent contact={data} />
}
