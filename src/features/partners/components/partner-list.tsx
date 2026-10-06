import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useOrderablePartners } from '@/features/partners/hooks/use-orderable-partners'
import { useDeletePartner } from '@/features/partners/hooks/use-delete-partner'
import { usePartners } from '@/features/partners/hooks/use-partners'
import { useReorderPartners } from '@/features/partners/hooks/use-reorder-partners'
import { PartnerDeleteConfirmationModal } from '@/features/partners/components/partner-delete-confirmation-modal'
import type {
  OrderablePartner,
  PagedPartnerList,
  PartnerListItem,
} from '@/features/partners/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50]
const SEARCH_DEBOUNCE_MS = 350
const ORDER_AUTO_SCROLL_EDGE = 72
const ORDER_AUTO_SCROLL_STEP = 18

type PartnerView = 'table' | 'order'

function formatWebsite(value: string | null): string {
  if (!value) return '—'

  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function formatDisplayOrder(displayOrder: number): string {
  return String(displayOrder).padStart(2, '0')
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || 'P'

  return `${parts[0]?.[0] || ''}${parts.at(-1)?.[0] || ''}`.toUpperCase()
}

function getOrderKey(items: OrderablePartner[]): string {
  return items.map((item) => item.id).join('|')
}

function reorderPartners(
  items: OrderablePartner[],
  sourceId: string,
  targetId: string,
): OrderablePartner[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [movedPartner] = nextItems.splice(sourceIndex, 1)

  if (!movedPartner) return items

  nextItems.splice(targetIndex, 0, movedPartner)
  return nextItems.map((item, index) => ({ ...item, displayOrder: index + 1 }))
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || fallback
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

function PartnerListSkeleton() {
  return (
    <section className="partner-list partner-list--loading" aria-label="Đang tải danh sách đối tác">
      <div className="partner-list__skeleton-heading">
        <Skeleton className="partner-list__skeleton-title" />
        <Skeleton className="partner-list__skeleton-create" />
      </div>
      <Skeleton className="partner-list__skeleton-controls" />
      <Skeleton className="partner-list__skeleton-table" />
    </section>
  )
}

type PartnerViewTabsProps = {
  activeView: PartnerView
  onChange: (view: PartnerView) => void
}

function PartnerViewTabs({ activeView, onChange }: PartnerViewTabsProps) {
  return (
    <div className="partner-list__tabs" role="tablist" aria-label="Chế độ xem đối tác">
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

type PartnerTableViewProps = {
  data: PagedPartnerList
  isFetching: boolean
  page: number
  pageSize: number
  searchInput: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchInputChange: (value: string) => void
}

type PartnerRowActionsProps = {
  partnerId: string
  partnerName: string
  canDelete?: boolean
  deleteBlockedReason?: string | null
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (path: string) => void
  onRequestDelete: () => void
}

function PartnerRowActions({
  partnerId,
  partnerName,
  canDelete = false,
  deleteBlockedReason,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: PartnerRowActionsProps) {
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
    const menuHeight = 112
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
    <div ref={actionsRef} className="partner-list__row-actions">
      <button
        type="button"
        className="partner-list__row-actions-trigger"
        aria-label={`Thao tác với ${partnerName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="partner-list__row-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => navigateTo(ROUTE_PATHS.PARTNER_DETAIL.replace(':id', partnerId))}
          >
            <FileText size={14} aria-hidden="true" />
            Xem chi tiết
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => navigateTo(ROUTE_PATHS.PARTNER_EDIT.replace(':id', partnerId))}
          >
            <Pencil size={14} aria-hidden="true" />
            Chỉnh sửa
          </button>
          <div className="partner-list__row-actions-separator" role="separator" />
          <button
            type="button"
            className="partner-list__row-actions-danger"
            role="menuitem"
            disabled={!canDelete}
            title={!canDelete ? deleteBlockedReason || 'Đối tác chưa thể xóa ở trạng thái hiện tại.' : undefined}
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

function PartnerTableView({
  data,
  isFetching,
  page,
  pageSize,
  searchInput,
  onPageChange,
  onPageSizeChange,
  onSearchInputChange,
}: PartnerTableViewProps) {
  const navigate = useNavigate()
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PartnerListItem | null>(null)
  const deleteConfirmation = useOverlayState()
  const deletePartner = useDeletePartner()

  function requestDelete(partner: PartnerListItem) {
    deletePartner.reset()
    setDeleteTarget(partner)
    deleteConfirmation.open()
  }

  async function confirmDelete() {
    if (!deleteTarget || deletePartner.isPending || deleteTarget.canDelete !== true) return

    try {
      await deletePartner.mutateAsync(deleteTarget.id)
      deleteConfirmation.close()
      setDeleteTarget(null)
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <>
      <div className="partner-list__controls" aria-label="Tìm kiếm đối tác">
        <label className="partner-list__search">
          <Search aria-hidden="true" />
          <input
            type="search"
            maxLength={200}
            value={searchInput}
            placeholder="Tìm kiếm theo tên đối tác..."
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </label>
      </div>

      <div
        className={`partner-list__content ${isFetching ? 'partner-list__content--refreshing' : ''}`}
        aria-busy={isFetching}
      >
        {isFetching && (
          <div className="partner-list__table-loading" role="status">
            <span className="partner-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}

        {data.items.length > 0 ? (
          <div className="partner-list__table" role="table" aria-label="Danh sách đối tác">
            <div className="partner-list__table-header" role="row">
              <span role="columnheader">Tên đối tác</span>
              <span role="columnheader">Mô tả</span>
              <span role="columnheader">Website</span>
              <span role="columnheader">Trạng thái đăng</span>
              <span className="partner-list__actions-heading" role="columnheader">
                <span className="sr-only">Thao tác</span>
              </span>
            </div>

            <div className="partner-list__rows" role="rowgroup">
              {data.items.map((partner) => (
                <div
                  className="partner-list__row"
                  key={partner.id}
                  role="row"
                >
                  <strong className="partner-list__name" role="cell">
                    {partner.name}
                  </strong>
                  <span className="partner-list__description" role="cell">
                    {partner.description || '—'}
                  </span>
                  <span className="partner-list__website" role="cell">
                    {formatWebsite(partner.websiteUrl)}
                  </span>
                  <span role="cell">
                    <Chip
                      className={`partner-list__publish partner-list__publish--${
                        partner.isPublished ? 'published' : 'unpublished'
                      }`}
                      color="default"
                      size="sm"
                      variant="secondary"
                    >
                      {partner.isPublished ? 'Đã đăng' : 'Chưa đăng'}
                    </Chip>
                  </span>
                  <span className="partner-list__actions-cell" role="cell">
                    <PartnerRowActions
                      partnerId={partner.id}
                      partnerName={partner.name}
                      canDelete={partner.canDelete}
                      deleteBlockedReason={partner.deleteBlockedReason}
                      isOpen={openActionId === partner.id}
                      onOpen={() => setOpenActionId(partner.id)}
                      onClose={() => setOpenActionId(null)}
                      onNavigate={(path) => navigate(path)}
                      onRequestDelete={() => requestDelete(partner)}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="partner-list__empty">
            <p>Không tìm thấy đối tác phù hợp.</p>
          </div>
        )}

        <footer className="partner-list__pagination">
          <label className="partner-list__page-size">
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

          <div className="partner-list__pagination-controls">
            <span>Trang {data.totalPages === 0 ? 0 : data.page} / {data.totalPages}</span>
            <div className="partner-list__pagination-actions">
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
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang sau"
                isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
                onClick={() => onPageChange(page + 1)}
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
      <PartnerDeleteConfirmationModal
        state={deleteConfirmation}
        partnerName={deleteTarget?.name ?? null}
        isPending={deletePartner.isPending}
        errorMessage={deletePartner.error ? getErrorMessage(deletePartner.error, 'Không thể xóa đối tác. Vui lòng thử lại.') : null}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

type PartnerOrderViewProps = {
  enabled: boolean
}

function PartnerOrderView({ enabled }: PartnerOrderViewProps) {
  const orderQuery = useOrderablePartners(enabled)
  const reorderMutation = useReorderPartners()
  const trackRef = useRef<HTMLDivElement>(null)
  const [orderState, setOrderState] = useState<{
    sourceKey: string
    items: OrderablePartner[]
  }>({ sourceKey: '', items: [] })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    message: string
    tone: 'success' | 'warning'
  } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return

    const timeoutId = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  if (!enabled) return null

  if (orderQuery.isPending) {
    return (
      <div className="partner-order partner-order--loading">
        <div className="partner-order__toolbar">
          <Skeleton className="partner-order__skeleton-save" />
        </div>
        <div className="partner-order__skeleton-track">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="partner-order__skeleton-card" key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (!orderQuery.data || orderQuery.error) {
    return (
      <div className="partner-order__error">
        <p>{getErrorMessage(orderQuery.error, 'Không thể tải danh sách sắp xếp đối tác.')}</p>
        <Button type="button" variant="primary" onClick={() => void orderQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }

  const sourcePartners = orderQuery.data
  const sourceKey = getOrderKey(sourcePartners)
  const orderedPartners = orderState.sourceKey === sourceKey ? orderState.items : sourcePartners
  const hasOrderChanges = getOrderKey(orderedPartners) !== sourceKey

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, partner: OrderablePartner) => {
    if (reorderMutation.isPending) {
      event.preventDefault()
      return
    }

    reorderMutation.reset()
    setNotice(null)
    setSaveError(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', partner.id)
    setDraggingId(partner.id)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, partner: OrderablePartner) => {
    if (!draggingId || draggingId === partner.id || reorderMutation.isPending) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverId(partner.id)

    const track = trackRef.current
    if (!track) return

    const rect = track.getBoundingClientRect()
    if (event.clientX < rect.left + ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: -ORDER_AUTO_SCROLL_STEP })
    } else if (event.clientX > rect.right - ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: ORDER_AUTO_SCROLL_STEP })
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, partner: OrderablePartner) => {
    event.preventDefault()
    const sourceId = draggingId || event.dataTransfer.getData('text/plain')

    if (sourceId) {
      setOrderState({
        sourceKey,
        items: reorderPartners(orderedPartners, sourceId, partner.id),
      })
    }

    resetDragState()
  }

  const handleSaveOrder = async () => {
    if (!hasOrderChanges || reorderMutation.isPending) return

    reorderMutation.reset()
    setNotice(null)
    setSaveError(null)

    try {
      const savedPartners = await reorderMutation.mutateAsync({
        orderedPartnerIds: orderedPartners.map((partner) => partner.id),
      })
      setOrderState({ sourceKey: getOrderKey(savedPartners), items: savedPartners })
      setNotice({
        message: 'Đã lưu thứ tự hiển thị đối tác.',
        tone: 'success',
      })
    } catch (error) {
      if (
        axios.isAxiosError<ApiResponse<unknown>>(error) &&
        error.response?.data?.errors?.code === 'PARTNER_ORDER_INVALID'
      ) {
        const refetchResult = await orderQuery.refetch()

        if (refetchResult.isSuccess && refetchResult.data) {
          setOrderState({
            sourceKey: getOrderKey(refetchResult.data),
            items: refetchResult.data,
          })
          setNotice({
            message: 'Danh sách sắp xếp đã thay đổi. Dữ liệu đã được tải lại.',
            tone: 'warning',
          })
        } else {
          setSaveError('Danh sách sắp xếp đã thay đổi. Vui lòng tải lại danh sách.')
        }
        return
      }

      setSaveError(getErrorMessage(error, 'Không thể lưu thứ tự đối tác.'))
    }
  }

  return (
    <div className="partner-order">
      <div className="partner-order__toolbar">
        <Button
          className="partner-list__save-order"
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
          className={`partner-order__toast partner-order__toast--${notice.tone}`}
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

      {saveError && (
        <p className="partner-list__save-error" role="alert">
          {saveError}
        </p>
      )}

      {orderedPartners.length > 0 ? (
        <div
          ref={trackRef}
          className="partner-order__track"
          role="list"
          aria-label="Thứ tự hiển thị đối tác"
        >
          {orderedPartners.map((partner) => (
            <div
              className={`partner-order__card ${
                draggingId === partner.id ? 'partner-order__card--dragging' : ''
              } ${dragOverId === partner.id ? 'partner-order__card--drag-over' : ''}`}
              key={partner.id}
              role="listitem"
              draggable={!reorderMutation.isPending}
              aria-label={`${partner.name}, thứ tự ${partner.displayOrder}`}
              onDragStart={(event) => handleDragStart(event, partner)}
              onDragOver={(event) => handleDragOver(event, partner)}
              onDrop={(event) => handleDrop(event, partner)}
              onDragEnd={resetDragState}
            >
              <div className="partner-order__logo" aria-hidden="true">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt="" />
                ) : (
                  <span>{getInitials(partner.name)}</span>
                )}
              </div>
              <strong className="partner-order__name">{partner.name}</strong>
              <div
                className="partner-order__position"
                aria-label={`Thứ tự hiển thị ${formatDisplayOrder(partner.displayOrder)}`}
              >
                <strong>{formatDisplayOrder(partner.displayOrder)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="partner-order__empty">Chưa có đối tác đang đăng để sắp xếp.</div>
      )}
    </div>
  )
}

export function PartnerList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView: PartnerView = searchParams.get('view') === 'order' ? 'order' : 'table'
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const handleViewChange = (view: PartnerView) => {
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

  const partnersQuery = usePartners({
    search: search || undefined,
    page,
    pageSize,
  })

  if (activeView === 'table' && partnersQuery.isPending) {
    return <PartnerListSkeleton />
  }

  return (
    <section
      className={`partner-list ${location.state?.partnerNavigation === 'back-to-list' ? 'partner-list--back-enter' : ''}`}
    >
      <header className="partner-list__heading">
        <h1>Quản lý đối tác</h1>
        <Button
          className="partner-list__create"
          type="button"
          variant="primary"
          onClick={() => navigate(ROUTE_PATHS.PARTNER_CREATE)}
        >
          <Plus size={16} aria-hidden="true" />
          Thêm đối tác
        </Button>
      </header>

      {activeView === 'table' ? (
        !partnersQuery.data || partnersQuery.error ? (
          <div className="partner-list__inline-error">
            <p>{getErrorMessage(partnersQuery.error, 'Không thể tải danh sách đối tác.')}</p>
            <Button type="button" variant="primary" onClick={() => void partnersQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <PartnerTableView
            data={partnersQuery.data}
            isFetching={partnersQuery.isFetching}
            page={page}
            pageSize={pageSize}
            searchInput={searchInput}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPage(1)
            }}
            onSearchInputChange={setSearchInput}
          />
        )
      ) : (
        <PartnerOrderView enabled={activeView === 'order'} />
      )}

      <PartnerViewTabs activeView={activeView} onChange={handleViewChange} />
    </section>
  )
}
