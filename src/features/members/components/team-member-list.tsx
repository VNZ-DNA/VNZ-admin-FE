import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useOrderableTeamMembers } from '@/features/members/hooks/use-orderable-team-members'
import { useDeleteTeamMember } from '@/features/members/hooks/use-delete-team-member'
import { useReorderTeamMembers } from '@/features/members/hooks/use-reorder-team-members'
import { useTeamMembers } from '@/features/members/hooks/use-team-members'
import { TeamMemberDeleteConfirmationModal } from '@/features/members/components/team-member-delete-confirmation-modal'
import { teamMemberService } from '@/features/members/services/team-member.service'
import type {
  OrderableTeamMember,
  TeamMemberListItem,
  TeamMemberEmploymentStatus,
  TeamMemberPagedResult,
} from '@/features/members/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const SEARCH_DEBOUNCE_MS = 350
const ORDER_AUTO_SCROLL_EDGE = 72
const ORDER_AUTO_SCROLL_STEP = 18

type MemberView = 'table' | 'order'

const employmentStatusOptions: Array<{
  label: string
  value: TeamMemberEmploymentStatus
}> = [
  { label: 'Đang làm việc', value: 'Working' },
  { label: 'Đã nghỉ việc', value: 'Resigned' },
]

type TeamMemberFilterOption<T extends string = string> = {
  label: string
  value: T
}

type TeamMemberMultiSelectFilterProps<T extends string = string> = {
  label: string
  values: T[]
  options: TeamMemberFilterOption<T>[]
  isLoading?: boolean
  hasError?: boolean
  onChange: (values: T[]) => void
}

function TeamMemberMultiSelectFilter<T extends string>({
  label,
  values,
  options,
  isLoading = false,
  hasError = false,
  onChange,
}: TeamMemberMultiSelectFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const triggerLabel = values.length > 0 ? `${label} · ${values.length}` : label

  return (
    <div className="team-member-list__multi-filter" ref={filterRef}>
      <button
        ref={triggerRef}
        className="team-member-list__multi-filter-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={isLoading}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{isLoading ? 'Đang tải...' : triggerLabel}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          className="team-member-list__multi-filter-options"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          <div className="team-member-list__multi-filter-options-header">
            <span>{label}</span>
            {values.length > 0 && (
              <button type="button" onClick={() => onChange([])}>
                Xóa chọn
              </button>
            )}
          </div>
          {isLoading ? (
            <span className="team-member-list__multi-filter-empty" role="status">
              Đang tải tùy chọn...
            </span>
          ) : options.length === 0 ? (
            <span className="team-member-list__multi-filter-empty" role={hasError ? 'alert' : undefined}>
              {hasError ? 'Không thể tải tùy chọn lọc.' : 'Không có lựa chọn.'}
            </span>
          ) : options.map((option) => {
            const isSelected = values.includes(option.value)
            const nextValues = isSelected
              ? values.filter((value) => value !== option.value)
              : [...values, option.value]

            return (
              <button
                className={`team-member-list__multi-filter-option ${isSelected ? 'is-selected' : ''}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() =>
                  onChange(
                    options.filter(({ value }) => nextValues.includes(value)).map(({ value }) => value),
                  )
                }
              >
                <span className="team-member-list__multi-filter-checkbox" aria-hidden="true">
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

function formatDisplayOrder(displayOrder: number | null): string {
  if (displayOrder === null) return '—'
  return String(displayOrder).padStart(2, '0')
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || '—'

  return `${parts[0]?.[0] || ''}${parts.at(-1)?.[0] || ''}`.toUpperCase()
}

function getOrderKey(items: OrderableTeamMember[]): string {
  return items.map((item) => item.id).join('|')
}

function reorderMembers(
  items: OrderableTeamMember[],
  sourceId: string,
  targetId: string,
): OrderableTeamMember[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [movedMember] = nextItems.splice(sourceIndex, 1)

  if (!movedMember) return items

  nextItems.splice(targetIndex, 0, movedMember)
  return nextItems.map((item, index) => ({ ...item, displayOrder: index + 1 }))
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || fallback
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

type TeamMemberRowActionsProps = {
  memberId: string
  memberName: string
  canDelete?: boolean
  deleteBlockedReason?: string | null
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (path: string) => void
  onRequestDelete: () => void
}

function TeamMemberRowActions({
  memberId,
  memberName,
  canDelete = false,
  deleteBlockedReason,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: TeamMemberRowActionsProps) {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateMenuPosition = useCallback(() => {
    const triggerRect = actionsRef.current?.getBoundingClientRect()
    if (!triggerRect) return

    const isOutsideViewport =
      triggerRect.bottom <= 0 ||
      triggerRect.top >= window.innerHeight ||
      triggerRect.right <= 0 ||
      triggerRect.left >= window.innerWidth

    if (isOutsideViewport) {
      setMenuPosition(null)
      onClose()
      return
    }

    const menuWidth = 160
    const menuHeight = 132
    const viewportPadding = 8
    const gap = 5
    const left = Math.max(
      viewportPadding,
      Math.min(triggerRect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
    )
    const opensBelow = triggerRect.bottom + gap + menuHeight <= window.innerHeight - viewportPadding
    const top = opensBelow
      ? triggerRect.bottom + gap
      : Math.max(viewportPadding, triggerRect.top - gap - menuHeight)

    setMenuPosition({ top, left })
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!actionsRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuPosition(null)
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuPosition(null)
        onClose()
      }
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
  }, [isOpen, onClose, updateMenuPosition])

  function navigateTo(path: string) {
    setMenuPosition(null)
    onClose()
    onNavigate(path)
  }

  function toggleMenu() {
    if (isOpen) {
      setMenuPosition(null)
      onClose()
      return
    }

    updateMenuPosition()
    onOpen()
  }

  return (
    <div ref={actionsRef} className="team-member-list__row-actions">
      <button
        type="button"
        className="team-member-list__row-actions-trigger"
        aria-label={`Thao tác với ${memberName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation()
          toggleMenu()
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="team-member-list__row-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => navigateTo(ROUTE_PATHS.MEMBER_DETAIL.replace(':id', memberId))}
          >
            <FileText size={14} aria-hidden="true" />
            Xem chi tiết
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => navigateTo(ROUTE_PATHS.MEMBER_EDIT.replace(':id', memberId))}
          >
            <Pencil size={14} aria-hidden="true" />
            Chỉnh sửa
          </button>
          <div className="team-member-list__row-actions-separator" role="separator" />
          <button
            type="button"
            className="team-member-list__row-actions-danger"
            role="menuitem"
            disabled={!canDelete}
            title={!canDelete ? deleteBlockedReason || 'Thành viên chưa thể xóa ở trạng thái hiện tại.' : undefined}
            onClick={() => {
              if (!canDelete) return
              setMenuPosition(null)
              onClose()
              onRequestDelete()
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Xóa
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

function TeamMemberListSkeleton() {
  return (
    <section className="team-member-list team-member-list--loading" aria-label="Đang tải danh sách thành viên">
      <div className="team-member-list__skeleton-heading">
        <Skeleton className="team-member-list__skeleton-title" />
        <Skeleton className="team-member-list__skeleton-create" />
      </div>
      <Skeleton className="team-member-list__skeleton-controls" />
      <Skeleton className="team-member-list__skeleton-table" />
    </section>
  )
}

type MemberViewTabsProps = {
  activeView: MemberView
  onChange: (view: MemberView) => void
}

function MemberViewTabs({ activeView, onChange }: MemberViewTabsProps) {
  return (
    <div className="team-member-list__tabs" role="tablist" aria-label="Chế độ xem thành viên">
      <button
        className={activeView === 'table' ? 'is-active' : ''}
        type="button"
        role="tab"
        aria-selected={activeView === 'table'}
        onClick={() => onChange('table')}
      >
        Danh sách
      </button>
      <button
        className={activeView === 'order' ? 'is-active' : ''}
        type="button"
        role="tab"
        aria-selected={activeView === 'order'}
        onClick={() => onChange('order')}
      >
        Sắp xếp thứ tự
      </button>
    </div>
  )
}

type TeamMemberTableViewProps = {
  data: TeamMemberPagedResult
  isFetching: boolean
  isFilterOptionsLoading: boolean
  hasFilterOptionsError: boolean
  pageSize: number
  searchInput: string
  statuses: TeamMemberEmploymentStatus[]
  positions: string[]
  jobLevels: string[]
  selectedPositions: string[]
  selectedJobLevels: string[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchInputChange: (value: string) => void
  onStatusChange: (statuses: TeamMemberEmploymentStatus[]) => void
  onPositionChange: (positions: string[]) => void
  onJobLevelChange: (jobLevels: string[]) => void
}

function TeamMemberTableView({
  data,
  isFetching,
  isFilterOptionsLoading,
  hasFilterOptionsError,
  pageSize,
  searchInput,
  statuses,
  positions,
  jobLevels,
  selectedPositions,
  selectedJobLevels,
  onPageChange,
  onPageSizeChange,
  onSearchInputChange,
  onStatusChange,
  onPositionChange,
  onJobLevelChange,
}: TeamMemberTableViewProps) {
  const navigate = useNavigate()
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberListItem | null>(null)
  const deleteConfirmation = useOverlayState()
  const deleteTeamMember = useDeleteTeamMember()
  const displayPage = data.totalPages === 0 ? 0 : data.page

  function requestDelete(member: TeamMemberListItem) {
    deleteTeamMember.reset()
    setDeleteTarget(member)
    deleteConfirmation.open()
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteTeamMember.isPending || deleteTarget.canDelete !== true) return

    try {
      await deleteTeamMember.mutateAsync(deleteTarget.id)
      deleteConfirmation.close()
      setDeleteTarget(null)
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <>
      <div className="team-member-list__controls" aria-label="Bộ lọc thành viên">
        <label className="team-member-list__search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            maxLength={300}
            placeholder="Tìm theo tên hoặc email..."
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </label>

        <TeamMemberMultiSelectFilter
          label="Trạng thái"
          options={employmentStatusOptions}
          values={statuses}
          onChange={onStatusChange}
        />
        <TeamMemberMultiSelectFilter
          label="Vị trí"
          options={positions.map((value) => ({ label: value, value }))}
          values={selectedPositions}
          isLoading={isFilterOptionsLoading}
          hasError={hasFilterOptionsError}
          onChange={onPositionChange}
        />
        <TeamMemberMultiSelectFilter
          label="Cấp bậc"
          options={jobLevels.map((value) => ({ label: value, value }))}
          values={selectedJobLevels}
          isLoading={isFilterOptionsLoading}
          hasError={hasFilterOptionsError}
          onChange={onJobLevelChange}
        />
      </div>

      <div
        className={`team-member-list__content ${isFetching ? 'team-member-list__content--refreshing' : ''}`}
        aria-busy={isFetching}
      >
        {isFetching && (
          <div className="team-member-list__table-loading" role="status">
            <span className="team-member-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}

        {data.items.length > 0 ? (
          <div className="team-member-list__table" role="table" aria-label="Danh sách thành viên">
            <div className="team-member-list__table-header" role="row">
              <span role="columnheader">Thành viên</span>
              <span role="columnheader">Email</span>
              <span role="columnheader">Vị trí</span>
              <span role="columnheader">Cấp bậc</span>
              <span role="columnheader">Làm việc</span>
              <span role="columnheader">Hiển thị</span>
              <span className="team-member-list__actions-heading" role="columnheader">
                <span className="sr-only">Thao tác</span>
              </span>
            </div>

            <div className="team-member-list__rows" role="rowgroup">
              {data.items.map((member) => (
                <div
                  className="team-member-list__row"
                  key={member.id}
                  role="row"
                >
                  <strong className="team-member-list__name" role="cell">
                    {member.fullName}
                  </strong>
                  <span className="team-member-list__email" role="cell">
                    {member.email || '—'}
                  </span>
                  <span className="team-member-list__position" role="cell">
                    {member.position || '—'}
                  </span>
                  <span role="cell">{member.jobLevel || '—'}</span>
                  <span role="cell">{member.employmentStatus || '—'}</span>
                  <span role="cell">
                    <Chip
                      className={`team-member-list__publish-chip ${
                        member.isPublished
                          ? 'team-member-list__publish-chip--published'
                          : 'team-member-list__publish-chip--unpublished'
                      }`}
                      color="default"
                      size="sm"
                      variant="secondary"
                    >
                      {member.isPublished ? 'Đã đăng' : 'Chưa đăng'}
                    </Chip>
                  </span>
                  <span className="team-member-list__actions-cell" role="cell">
                    <TeamMemberRowActions
                      memberId={member.id}
                      memberName={member.fullName}
                      canDelete={member.canDelete}
                      deleteBlockedReason={member.deleteBlockedReason}
                      isOpen={openActionId === member.id}
                      onOpen={() => setOpenActionId(member.id)}
                      onClose={() => setOpenActionId(null)}
                      onNavigate={navigate}
                      onRequestDelete={() => requestDelete(member)}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="team-member-list__empty">Không tìm thấy thành viên phù hợp.</div>
        )}

        <footer className="team-member-list__pagination">
          <label className="team-member-list__page-size">
            <span>Số dòng/trang</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="team-member-list__pagination-controls">
            <span>Trang {displayPage} / {data.totalPages}</span>
            <div className="team-member-list__pagination-actions">
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang đầu"
                isDisabled={data.page <= 1 || isFetching}
                onClick={() => onPageChange(1)}
              >
                <ChevronsLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang trước"
                isDisabled={data.page <= 1 || isFetching}
                onClick={() => onPageChange(Math.max(1, data.page - 1))}
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang sau"
                isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
                onClick={() => onPageChange(data.page + 1)}
              >
                <ChevronRight size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang cuối"
                isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
                onClick={() => onPageChange(data.totalPages)}
              >
                <ChevronsRight size={17} />
              </Button>
            </div>
          </div>
        </footer>
      </div>
      <TeamMemberDeleteConfirmationModal
        state={deleteConfirmation}
        memberName={deleteTarget?.fullName ?? null}
        isPending={deleteTeamMember.isPending}
        errorMessage={deleteTeamMember.error ? getErrorMessage(deleteTeamMember.error, 'Không thể xóa thành viên. Vui lòng thử lại.') : null}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

type TeamMemberOrderViewProps = {
  enabled: boolean
}

function TeamMemberOrderView({ enabled }: TeamMemberOrderViewProps) {
  const orderQuery = useOrderableTeamMembers(enabled)
  const reorderMutation = useReorderTeamMembers()
  const trackRef = useRef<HTMLDivElement>(null)
  const [orderState, setOrderState] = useState<{
    sourceKey: string
    items: OrderableTeamMember[]
  }>({ sourceKey: '', items: [] })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    message: string
    tone: 'success' | 'warning'
  } | null>(null)

  useEffect(() => {
    if (!notice) return

    const timeoutId = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  if (!enabled) return null

  if (orderQuery.isPending) {
    return (
      <div className="team-member-order team-member-order--loading">
        <div className="team-member-order__toolbar">
          <Skeleton className="team-member-order__skeleton-save" />
        </div>
        <div className="team-member-order__skeleton-track">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="team-member-order__skeleton-card" key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (!orderQuery.data || orderQuery.error) {
    return (
      <div className="team-member-order__error">
        <p>{getErrorMessage(orderQuery.error, 'Không thể tải danh sách sắp xếp thành viên.')}</p>
        <Button type="button" variant="primary" onClick={() => void orderQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }

  const sourceMembers = orderQuery.data
  const sourceKey = getOrderKey(sourceMembers)
  const orderedMembers = orderState.sourceKey === sourceKey ? orderState.items : sourceMembers
  const hasOrderChanges = getOrderKey(orderedMembers) !== sourceKey

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, member: OrderableTeamMember) => {
    if (reorderMutation.isPending) {
      event.preventDefault()
      return
    }

    reorderMutation.reset()
    setNotice(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', member.id)
    setDraggingId(member.id)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, member: OrderableTeamMember) => {
    if (!draggingId || draggingId === member.id || reorderMutation.isPending) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverId(member.id)

    const track = trackRef.current
    if (!track) return

    const rect = track.getBoundingClientRect()
    if (event.clientX < rect.left + ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: -ORDER_AUTO_SCROLL_STEP })
    } else if (event.clientX > rect.right - ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: ORDER_AUTO_SCROLL_STEP })
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, member: OrderableTeamMember) => {
    event.preventDefault()
    const sourceId = draggingId || event.dataTransfer.getData('text/plain')

    if (sourceId) {
      setOrderState({
        sourceKey,
        items: reorderMembers(orderedMembers, sourceId, member.id),
      })
    }

    resetDragState()
  }

  const handleSaveOrder = async () => {
    reorderMutation.reset()
    setNotice(null)

    try {
      const savedMembers = await reorderMutation.mutateAsync({
        orderedMemberIds: orderedMembers.map((member) => member.id),
      })
      setOrderState({ sourceKey: getOrderKey(savedMembers), items: savedMembers })
      setNotice({
        message: 'Đã lưu thứ tự hiển thị thành viên.',
        tone: 'success',
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await orderQuery.refetch()
        setNotice({
          message: 'Thứ tự thành viên đã thay đổi. Danh sách đã được tải lại.',
          tone: 'warning',
        })
      }
    }
  }

  return (
    <div className="team-member-order">
      <div className="team-member-order__toolbar">
        <Button
          className="team-member-list__save-order"
          type="button"
          variant="outline"
          isDisabled={!hasOrderChanges || reorderMutation.isPending}
          onClick={() => void handleSaveOrder()}
        >
          <Save size={16} aria-hidden="true" />
          {reorderMutation.isPending ? 'Đang lưu...' : 'Lưu thứ tự'}
        </Button>
      </div>

      {notice && (
        <div
          className={`team-member-order__toast team-member-order__toast--${notice.tone}`}
          role="status"
          aria-live="polite"
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} aria-hidden="true" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {reorderMutation.error &&
        !(axios.isAxiosError(reorderMutation.error) && reorderMutation.error.response?.status === 409) && (
          <p className="team-member-list__save-error" role="alert">
            {getErrorMessage(reorderMutation.error, 'Không thể lưu thứ tự thành viên.')}
          </p>
        )}

      {orderedMembers.length > 0 ? (
        <div
          ref={trackRef}
          className="team-member-order__track"
          role="list"
          aria-label="Thứ tự hiển thị thành viên"
        >
          {orderedMembers.map((member) => (
            <div
              className={`team-member-order__card ${
                draggingId === member.id ? 'team-member-order__card--dragging' : ''
              } ${dragOverId === member.id ? 'team-member-order__card--drag-over' : ''}`}
              key={member.id}
              role="listitem"
              draggable={!reorderMutation.isPending}
              aria-label={`${member.fullName}, thứ tự ${member.displayOrder}`}
              onDragStart={(event) => handleDragStart(event, member)}
              onDragOver={(event) => handleDragOver(event, member)}
              onDrop={(event) => handleDrop(event, member)}
              onDragEnd={resetDragState}
            >
              <div className="team-member-order__avatar" aria-hidden="true">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" />
                ) : (
                  <span>{getInitials(member.fullName)}</span>
                )}
              </div>
              <div className="team-member-order__identity">
                <strong>{member.fullName}</strong>
                <span>{member.position || 'Chưa cập nhật vị trí'}</span>
              </div>
              <div
                className="team-member-order__position"
                aria-label={`Thứ tự hiển thị ${formatDisplayOrder(member.displayOrder)}`}
              >
                <strong>{formatDisplayOrder(member.displayOrder)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="team-member-order__empty">Chưa có thành viên đang đăng để sắp xếp.</div>
      )}
    </div>
  )
}

export function TeamMemberList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<TeamMemberEmploymentStatus[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [jobLevels, setJobLevels] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const activeView: MemberView = searchParams.get('view') === 'order' ? 'order' : 'table'
  const filterOptionsQuery = useQuery({
    queryKey: ['team-members', 'filter-options'],
    queryFn: () => teamMemberService.getTeamMemberFilterOptions(),
    enabled: activeView === 'table',
  })

  const handleViewChange = (view: MemberView) => {
    const nextParams = new URLSearchParams(searchParams)

    if (view === 'order') {
      nextParams.set('view', 'order')
    } else {
      nextParams.delete('view')
    }

    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const tableQuery = useTeamMembers({
    search: search || undefined,
    status: statuses.length > 0 ? statuses : undefined,
    position: positions.length > 0 ? positions : undefined,
    jobLevel: jobLevels.length > 0 ? jobLevels : undefined,
    page,
    pageSize,
  })

  if (activeView === 'table' && tableQuery.isPending) {
    return <TeamMemberListSkeleton />
  }

  return (
    <section
      className={`team-member-list ${location.state?.memberNavigation === 'back-to-list' ? 'team-member-list--back-enter' : ''}`}
    >
      <header className="team-member-list__heading">
        <h1>Quản lý thành viên</h1>
        <Button
          className="team-member-list__create"
          type="button"
          variant="primary"
          onClick={() => navigate(ROUTE_PATHS.MEMBER_CREATE)}
        >
          <Plus size={16} aria-hidden="true" />
          Thêm thành viên
        </Button>
      </header>

      {activeView === 'table' ? (
        !tableQuery.data || tableQuery.error ? (
          <div className="team-member-list__inline-error">
            <p>{getErrorMessage(tableQuery.error, 'Không thể tải danh sách thành viên.')}</p>
            <Button type="button" variant="primary" onClick={() => void tableQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <TeamMemberTableView
            data={tableQuery.data}
            isFetching={tableQuery.isFetching}
            isFilterOptionsLoading={filterOptionsQuery.isPending}
            hasFilterOptionsError={filterOptionsQuery.isError}
            pageSize={pageSize}
            searchInput={searchInput}
            statuses={statuses}
            positions={filterOptionsQuery.data?.positions ?? []}
            jobLevels={filterOptionsQuery.data?.jobLevels ?? []}
            selectedPositions={positions}
            selectedJobLevels={jobLevels}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(1)
            }}
            onSearchInputChange={setSearchInput}
            onStatusChange={(nextStatuses) => {
              setStatuses(nextStatuses)
              setPage(1)
            }}
            onPositionChange={(nextPositions) => {
              setPositions(nextPositions)
              setPage(1)
            }}
            onJobLevelChange={(nextJobLevels) => {
              setJobLevels(nextJobLevels)
              setPage(1)
            }}
          />
        )
      ) : (
        <TeamMemberOrderView enabled={activeView === 'order'} />
      )}

      <MemberViewTabs activeView={activeView} onChange={handleViewChange} />
    </section>
  )
}
