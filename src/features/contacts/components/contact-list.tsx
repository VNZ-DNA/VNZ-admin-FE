import { Button, Chip, Skeleton } from '@heroui/react'
import axios from 'axios'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useContacts } from '@/features/contacts/hooks/use-contacts'
import type { ContactStatusFilter } from '@/features/contacts/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const SEARCH_DEBOUNCE_MS = 350
const PAGE_SIZE_OPTIONS = Array.from({ length: 100 }, (_, index) => index + 1)

const statusOptions: Array<{ label: string; value: ContactStatusFilter }> = [
  { label: 'Chưa liên hệ', value: 'Chưa liên hệ' },
  { label: 'Đã liên hệ', value: 'Đã liên hệ' },
]

const readOptions = [
  { label: 'Chưa đọc', value: 'false' },
  { label: 'Đã đọc', value: 'true' },
]

type MultiSelectOption = {
  label: string
  value: string
}

type ContactMultiSelectFilterProps = {
  label: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

function ContactMultiSelectFilter({ label, options, selectedValues, onChange }: ContactMultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function toggleValue(value: string) {
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value]

    onChange(options.filter((option) => nextValues.includes(option.value)).map((option) => option.value))
  }

  return (
    <div ref={filterRef} className="news-list__filter news-list__multi-filter">
      <button
        type="button"
        className="news-list__multi-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedValues.length > 0 ? `${label} · ${selectedValues.length}` : label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="news-list__multi-menu" role="listbox" aria-label={label} aria-multiselectable="true">
          <div className="news-list__multi-menu-header">
            <span>{label}</span>
            {selectedValues.length > 0 && (
              <button type="button" onClick={() => onChange([])}>
                Xóa chọn
              </button>
            )}
          </div>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                className={`news-list__multi-option ${isSelected ? 'is-selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleValue(option.value)}
              >
                <span className="news-list__multi-checkbox" aria-hidden="true">
                  {isSelected && <Check size={12} strokeWidth={2.4} />}
                </span>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tải danh sách liên hệ khách hàng.'
  }

  return 'Không thể tải danh sách liên hệ khách hàng.'
}

function ContactListSkeleton() {
  return (
    <section className="contact-list contact-list--loading" aria-label="Đang tải danh sách liên hệ khách hàng">
      <div className="news-list__skeleton-heading">
        <Skeleton className="news-list__skeleton-title" />
      </div>
      <div className="news-list__skeleton-filters">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <Skeleton className="news-list__skeleton-table contact-list__skeleton-table" />
    </section>
  )
}

export function ContactList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<ContactStatusFilter[]>([])
  const [selectedReadStates, setSelectedReadStates] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const { data, error, isFetching, isPending, refetch } = useContacts({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    isRead: selectedReadStates.map((value) => value === 'true'),
    page,
    pageSize,
  })

  useEffect(() => {
    if (!data || data.totalItems === 0 || data.totalPages === 0 || data.items.length > 0 || page <= data.totalPages) return

    const timeoutId = window.setTimeout(() => setPage(data.totalPages), 0)

    return () => window.clearTimeout(timeoutId)
  }, [data, page])

  if (isPending) return <ContactListSkeleton />

  if (!data || error) {
    return (
      <section className="contact-list__error">
        <h1>Liên hệ khách hàng</h1>
        <p>{getErrorMessage(error)}</p>
        <Button type="button" variant="primary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const displayPage = data.totalPages === 0 ? 0 : data.page

  return (
    <section className={`contact-list ${location.state?.contactNavigation === 'back-to-list' ? 'contact-list--back-enter' : ''}`}>
      <header className="contact-list__heading">
        <h1>Liên hệ khách hàng</h1>
      </header>

      <div className="news-list__filters" aria-label="Bộ lọc liên hệ">
        <label className="news-list__search">
          <span className="sr-only">Tìm kiếm liên hệ</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            maxLength={300}
            value={searchInput}
            placeholder="Tìm theo họ tên, công ty hoặc email..."
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <ContactMultiSelectFilter
          label="Trạng thái"
          options={statusOptions}
          selectedValues={selectedStatuses}
          onChange={(values) => {
            setSelectedStatuses(values as ContactStatusFilter[])
            setPage(1)
          }}
        />

        <ContactMultiSelectFilter
          label="Trạng thái đọc"
          options={readOptions}
          selectedValues={selectedReadStates}
          onChange={(values) => {
            setSelectedReadStates(values)
            setPage(1)
          }}
        />
      </div>

      <div
        className={`news-list__content contact-list__content ${isFetching ? 'news-list__content--refreshing' : ''}`}
        aria-busy={isFetching}
      >
        {isFetching && (
          <div className="news-list__table-loading" role="status">
            <span className="news-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}
        {data.items.length > 0 ? (
          <div className="news-list__table-scroll contact-list__table-scroll">
            <table className="contact-list__table" aria-label="Danh sách liên hệ khách hàng">
              <thead>
                <tr>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Công ty</th>
                  <th scope="col">Email</th>
                  <th scope="col">Ngày gửi</th>
                  <th scope="col">Trạng thái liên hệ</th>
                  <th scope="col" className="contact-list__read-heading">
                    <span className="sr-only">Trạng thái đọc</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className={`news-list__row contact-list__row ${!item.isRead ? 'contact-list__row--unread' : ''}`}
                    tabIndex={0}
                    aria-label={`Xem chi tiết liên hệ của ${item.fullName}`}
                    onClick={() => navigate(ROUTE_PATHS.CONTACT_DETAIL.replace(':id', item.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(ROUTE_PATHS.CONTACT_DETAIL.replace(':id', item.id))
                      }
                    }}
                  >
                    <td>
                      <strong className="news-list__title contact-list__customer-name">{item.fullName}</strong>
                    </td>
                    <td>{item.companyName || '—'}</td>
                    <td>{item.email}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <Chip
                        className={`contact-list__status contact-list__status--${
                          item.contactStatus === 'Đã liên hệ' ? 'contacted' : 'not-contacted'
                        }`}
                        color="default"
                        size="sm"
                        variant="secondary"
                      >
                        {item.contactStatus}
                      </Chip>
                    </td>
                    <td className="contact-list__read-cell">
                      {!item.isRead && (
                        <span className="contact-list__unread-dot" aria-label="Chưa đọc" title="Chưa đọc" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="news-list__empty contact-list__empty">
            <p>
              {search || selectedStatuses.length > 0 || selectedReadStates.length > 0
                ? 'Không tìm thấy liên hệ phù hợp.'
                : 'Chưa có yêu cầu liên hệ.'}
            </p>
          </div>
        )}
      </div>

      <footer className="news-list__pagination contact-list__pagination">
        <label className="news-list__page-size">
          <span>Số dòng/trang</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="news-list__pagination-controls">
          <span>Trang {displayPage} / {data.totalPages}</span>
          <div className="news-list__pagination-actions">
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang đầu"
              isDisabled={data.page <= 1 || isFetching}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang trước"
              isDisabled={data.page <= 1 || isFetching}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang sau"
              isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              <ChevronRight size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang cuối"
              isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
              onClick={() => setPage(data.totalPages)}
            >
              <ChevronsRight size={17} />
            </Button>
          </div>
        </div>
      </footer>
    </section>
  )
}
