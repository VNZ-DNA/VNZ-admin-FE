import { Button, Checkbox, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Mail,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

import { useJobApplications } from '@/features/applicants/hooks/use-job-applications'
import { useJobApplicationFilterOptions } from '@/features/applicants/hooks/use-job-application-filter-options'
import { useDeleteJobApplication } from '@/features/applicants/hooks/use-delete-job-application'
import { JobApplicationDeleteConfirmationModal } from '@/features/applicants/components/job-application-delete-confirmation-modal'
import { getApplicantActionMenuPosition } from '@/features/applicants/utils/applicant-action-menu-position'
import { getPageSelectionState, updatePageSelection } from '@/features/applicants/utils/applicant-selection'
import { createInterviewInvitationLocationState } from '@/features/applicants/utils/interview-invitation-navigation'
import type {
  JobApplicationListItem,
  JobApplicationStatusFilter,
} from '@/features/applicants/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const SEARCH_DEBOUNCE_MS = 350

const statusOptions: Array<{ label: string; value: JobApplicationStatusFilter }> = [
  { label: 'Chờ duyệt', value: 'Pending' },
  { label: 'Đã duyệt', value: 'Accepted' },
  { label: 'Không duyệt', value: 'Rejected' },
  { label: 'Đã gửi email phỏng vấn', value: 'SendedEmail' },
]

type ApplicantFilterOption = { label: string; value: string }

type ApplicantMultiSelectFilterProps = {
  label: string
  options: ApplicantFilterOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}

function ApplicantMultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  disabled = false,
}: ApplicantMultiSelectFilterProps) {
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
    <div ref={filterRef} className="applicant-list__filter">
      <button
        type="button"
        className="applicant-list__multi-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedValues.length > 0 ? `${label} · ${selectedValues.length}` : label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="applicant-list__multi-menu" role="listbox" aria-label={label} aria-multiselectable="true">
          <div className="applicant-list__multi-menu-header">
            <span>{label}</span>
            {selectedValues.length > 0 && (
              <button type="button" onClick={() => onChange([])}>
                Xóa chọn
              </button>
            )}
          </div>
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = selectedValues.includes(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`applicant-list__multi-option ${isSelected ? 'is-selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleValue(option.value)}
                >
                  <span className="applicant-list__multi-checkbox" aria-hidden="true">
                    {isSelected && <Check size={12} strokeWidth={2.4} />}
                  </span>
                  <span>{option.label}</span>
                </button>
              )
            })
          ) : (
            <p className="applicant-list__multi-empty">Chưa có dữ liệu</p>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(value: string): string {
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
  const normalizedStatus = status.toLocaleLowerCase('vi-VN')

  if (normalizedStatus === 'pending' || normalizedStatus === 'chờ duyệt') return 'applicant-list__status--pending'
  if (normalizedStatus === 'accepted' || normalizedStatus === 'đã duyệt') return 'applicant-list__status--accepted'
  if (normalizedStatus === 'rejected' || normalizedStatus === 'không duyệt') return 'applicant-list__status--rejected'
  if (normalizedStatus === 'sendedemail' || normalizedStatus === 'đã gửi email phỏng vấn') {
    return 'applicant-list__status--sent-email'
  }

  return 'applicant-list__status--default'
}

function canSelectForInterviewEmail(item: JobApplicationListItem): boolean {
  return item.canSelectForInterviewEmail === true
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tải danh sách hồ sơ ứng viên.'
  }

  return 'Không thể tải danh sách hồ sơ ứng viên.'
}

function getDeleteErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const code = error.response?.data?.errors?.code
    if (code === 'JOB_APPLICATION_NOT_FOUND') return 'Hồ sơ ứng viên không còn tồn tại.'
    return error.response?.data?.message || 'Không thể xóa hồ sơ ứng viên. Vui lòng thử lại.'
  }

  return 'Không thể xóa hồ sơ ứng viên. Vui lòng thử lại.'
}

type ApplicantRowActionsProps = {
  applicantName: string
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: () => void
  onRequestDelete: () => void
}

function ApplicantRowActions({
  applicantName,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: ApplicantRowActionsProps) {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => {
    setMenuPosition(null)
    onClose()
  }, [onClose])

  const updateMenuPosition = useCallback(() => {
    const triggerRect = actionsRef.current?.getBoundingClientRect()
    if (!triggerRect) return

    const nextPosition = getApplicantActionMenuPosition(triggerRect, {
      width: window.innerWidth,
      height: window.innerHeight,
    })

    if (!nextPosition) {
      closeMenu()
      return
    }

    setMenuPosition(nextPosition)
  }, [closeMenu])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!actionsRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, isOpen, updateMenuPosition])

  function toggleMenu() {
    if (isOpen) {
      closeMenu()
      return
    }

    updateMenuPosition()
    onOpen()
  }

  function navigateToApplicant() {
    closeMenu()
    onNavigate()
  }

  function requestDelete() {
    closeMenu()
    onRequestDelete()
  }

  return (
    <div ref={actionsRef} className="applicant-list__row-actions">
      <button
        type="button"
        className="applicant-list__row-actions-trigger"
        aria-label={`Thao tác với ${applicantName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="applicant-list__row-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button type="button" role="menuitem" onClick={navigateToApplicant}>
            <FileText size={14} aria-hidden="true" />
            Xem chi tiết
          </button>
          <div className="applicant-list__row-actions-separator" role="separator" />
          <button type="button" role="menuitem" className="applicant-list__row-actions-danger" onClick={requestDelete}>
            <Trash2 size={14} aria-hidden="true" />
            Xóa hồ sơ ứng viên
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

function ApplicantListSkeleton({ isBackNavigation = false }: { isBackNavigation?: boolean }) {
  return (
    <section
      className={`applicant-list applicant-list--loading ${isBackNavigation ? 'applicant-list--back-enter' : ''}`}
      aria-label="Đang tải danh sách hồ sơ ứng viên"
    >
      <Skeleton className="applicant-list__skeleton-heading" />
      <div className="applicant-list__skeleton-controls">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton className="applicant-list__skeleton-email" />
      </div>
      <Skeleton className="applicant-list__skeleton-table" />
    </section>
  )
}

export function ApplicantList() {
  const location = useLocation()
  const navigate = useNavigate()
  const filterOptionsQuery = useJobApplicationFilterOptions()
  const isBackNavigation = location.state?.applicantNavigation === 'back-to-list'
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<JobApplicationStatusFilter[]>([])
  const [selectedJobPostIds, setSelectedJobPostIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobApplicationListItem | null>(null)
  const deleteConfirmation = useOverlayState()
  const deleteJobApplication = useDeleteJobApplication()
  const openRowActions = useCallback((applicantId: string) => setOpenActionId(applicantId), [])
  const closeRowActions = useCallback((applicantId: string) => {
    setOpenActionId((currentId) => currentId === applicantId ? null : currentId)
  }, [])

  function requestDelete(item: JobApplicationListItem) {
    setDeleteTarget(item)
    deleteJobApplication.reset()
    deleteConfirmation.open()
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteJobApplication.isPending) return

    try {
      await deleteJobApplication.mutateAsync(deleteTarget.id)
      setSelectedIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(deleteTarget.id)
        return nextIds
      })
      deleteConfirmation.close()
      setDeleteTarget(null)
    } catch {
      // The modal keeps the server error visible and allows a retry.
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
      setSelectedIds(new Set())
      setOpenActionId(null)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const { data, error, isFetching, isPending, isPlaceholderData, refetch } = useJobApplications({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    jobPostId: selectedJobPostIds.length > 0 ? selectedJobPostIds : undefined,
    page,
    pageSize,
  })

  const currentItems = data?.items ?? []
  const pageSelection = getPageSelectionState(currentItems, selectedIds)
  const hasSelectableApplicants = currentItems.some(canSelectForInterviewEmail)
  const displayPage = data ? (isPlaceholderData ? page : data.page) : page

  if (isPending) {
    return <ApplicantListSkeleton isBackNavigation={isBackNavigation} />
  }

  if (!data || error) {
    return (
      <section className={`applicant-list__error ${isBackNavigation ? 'applicant-list--back-enter' : ''}`}>
        <h1>Hồ sơ ứng viên</h1>
        <p>{getErrorMessage(error)}</p>
        <Button type="button" variant="primary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const selectedApplicants = data.items.filter(
    (item) => selectedIds.has(item.id) && canSelectForInterviewEmail(item),
  )

  function toggleApplicant(item: JobApplicationListItem, isSelected: boolean) {
    if (!canSelectForInterviewEmail(item)) {
      return
    }

    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (isSelected) {
        nextIds.add(item.id)
      } else {
        nextIds.delete(item.id)
      }

      return nextIds
    })
  }

  function goToPage(nextPage: number) {
    setPage(nextPage)
    setSelectedIds(new Set())
    setOpenActionId(null)
  }

  return (
    <section className={`applicant-list ${isBackNavigation ? 'applicant-list--back-enter' : ''}`}>
      <header className="applicant-list__heading">
        <div>
          <h1>Hồ sơ ứng viên</h1>
        </div>
      </header>

      <div className="applicant-list__controls">
        <label className="applicant-list__search">
          <span className="sr-only">Tìm hồ sơ ứng viên</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            maxLength={300}
            placeholder="Tìm theo tên hoặc email..."
            onChange={(event) => {
              setSearchInput(event.target.value)
              setSelectedIds(new Set())
              setOpenActionId(null)
            }}
          />
        </label>

        <ApplicantMultiSelectFilter
          label="Trạng thái"
          options={statusOptions}
          selectedValues={selectedStatuses}
          onChange={(values) => {
            setSelectedStatuses(values as JobApplicationStatusFilter[])
            setPage(1)
            setSelectedIds(new Set())
            setOpenActionId(null)
          }}
        />

        <ApplicantMultiSelectFilter
          label="Vị trí"
          options={filterOptionsQuery.data?.jobPosts.map((jobPost) => ({
            label: jobPost.title,
            value: jobPost.id,
          })) ?? []}
          selectedValues={selectedJobPostIds}
          disabled={filterOptionsQuery.isPending || Boolean(filterOptionsQuery.error)}
          onChange={(values) => {
            setSelectedJobPostIds(values)
            setPage(1)
            setSelectedIds(new Set())
            setOpenActionId(null)
          }}
        />

        <Button
          className="applicant-list__interview-email"
          type="button"
          variant="primary"
          isDisabled={selectedApplicants.length === 0 || isPlaceholderData}
          onClick={() =>
            navigate(ROUTE_PATHS.APPLICANT_INTERVIEW_INVITATION, {
              state: createInterviewInvitationLocationState(selectedApplicants),
            })
          }
        >
          <Mail size={16} aria-hidden="true" />
          Gửi Email Phỏng Vấn
        </Button>
      </div>

      {filterOptionsQuery.error && (
        <div className="applicant-list__filter-error" role="alert">
          <span>Không thể tải tùy chọn vị trí ứng tuyển.</span>
          <Button type="button" variant="ghost" onClick={() => void filterOptionsQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      <div
        className={`applicant-list__table-wrap ${isFetching ? 'applicant-list__table-wrap--refreshing' : ''}`}
        aria-busy={isFetching}
      >
        {isFetching && (
          <div className="applicant-list__table-loading" role="status">
            <span className="applicant-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}
        {data.items.length > 0 ? (
          <table className="applicant-list__table">
            <thead>
              <tr>
                <th scope="col" className="applicant-list__selection applicant-list__selection-heading">
                  <input
                    className="applicant-list__select-all"
                    type="checkbox"
                    aria-label="Chọn tất cả ứng viên đủ điều kiện trên trang hiện tại"
                    aria-checked={pageSelection.isIndeterminate ? 'mixed' : pageSelection.isAllSelected}
                    checked={pageSelection.isAllSelected}
                    disabled={!hasSelectableApplicants || isPlaceholderData}
                    ref={(element) => {
                      if (element) element.indeterminate = pageSelection.isIndeterminate
                    }}
                    onChange={(event) =>
                      setSelectedIds((currentIds) => updatePageSelection(currentIds, data.items, event.target.checked))
                    }
                  />
                </th>
                <th scope="col">Ứng viên</th>
                <th scope="col">Email</th>
                <th scope="col">Vị trí ứng tuyển</th>
                <th scope="col">Ngày nộp</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="applicant-list__actions-heading">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  className="applicant-list__row"
                >
                  <td className="applicant-list__selection">
                    <Checkbox
                      aria-label={`Chọn ${item.fullName} để gửi email phỏng vấn`}
                      isDisabled={!canSelectForInterviewEmail(item) || isPlaceholderData}
                      isSelected={canSelectForInterviewEmail(item) && selectedIds.has(item.id)}
                      onChange={(isSelected) => toggleApplicant(item, isSelected)}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </td>
                  <td>
                    <div className="applicant-list__applicant">
                      <strong>{item.fullName}</strong>
                    </div>
                  </td>
                  <td className="applicant-list__email">{item.email}</td>
                  <td>{item.jobPostTitle}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    <Chip
                      className={`applicant-list__status ${getStatusClassName(item.status)}`}
                      color="default"
                      size="sm"
                      variant="secondary"
                    >
                      {item.status}
                    </Chip>
                  </td>
                  <td className="applicant-list__actions-cell">
                    <ApplicantRowActions
                      applicantName={item.fullName}
                      isOpen={openActionId === item.id}
                      onOpen={() => openRowActions(item.id)}
                      onClose={() => closeRowActions(item.id)}
                      onNavigate={() => navigate(`${ROUTE_PATHS.APPLICANTS}/${item.id}`)}
                      onRequestDelete={() => requestDelete(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="applicant-list__empty">
            <p>
              {search || selectedStatuses.length > 0 || selectedJobPostIds.length > 0
                ? 'Không tìm thấy hồ sơ phù hợp.'
                : 'Chưa có hồ sơ ứng viên.'}
            </p>
          </div>
        )}
      </div>

      <footer className="applicant-list__pagination">
        <div className="applicant-list__pagination-summary">
          <label className="applicant-list__page-size">
            <span>Số dòng/trang</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
                setSelectedIds(new Set())
                setOpenActionId(null)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="applicant-list__pagination-controls">
          <span>Trang {data.totalPages === 0 ? 0 : displayPage} / {data.totalPages}</span>
          <div className="applicant-list__pagination-actions">
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang đầu"
              isDisabled={displayPage <= 1 || isFetching}
              onClick={() => goToPage(1)}
            >
              <ChevronsLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang trước"
              isDisabled={displayPage <= 1 || isFetching}
              onClick={() => goToPage(Math.max(1, displayPage - 1))}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang sau"
              isDisabled={data.totalPages === 0 || displayPage >= data.totalPages || isFetching}
              onClick={() => goToPage(Math.min(data.totalPages, displayPage + 1))}
            >
              <ChevronRight size={17} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang cuối"
              isDisabled={data.totalPages === 0 || displayPage >= data.totalPages || isFetching}
              onClick={() => goToPage(data.totalPages)}
            >
              <ChevronsRight size={17} />
            </Button>
          </div>
        </div>
      </footer>

      <JobApplicationDeleteConfirmationModal
        state={deleteConfirmation}
        applicantName={deleteTarget?.fullName ?? null}
        isPending={deleteJobApplication.isPending}
        errorMessage={deleteJobApplication.error ? getDeleteErrorMessage(deleteJobApplication.error) : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
