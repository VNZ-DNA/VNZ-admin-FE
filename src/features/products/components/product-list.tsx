import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
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
import { type DragEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { useOrderableProducts } from '@/features/products/hooks/use-orderable-products'
import { useDeleteProduct } from '@/features/products/hooks/use-delete-product'
import { useProducts } from '@/features/products/hooks/use-products'
import { useReorderProducts } from '@/features/products/hooks/use-reorder-products'
import { ProductDeleteConfirmationModal } from '@/features/products/components/product-delete-confirmation-modal'
import type {
  OrderableProduct,
  PagedProductList,
  ProductListItem,
  ProductStatus,
} from '@/features/products/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 350
const ORDER_AUTO_SCROLL_EDGE = 72
const ORDER_AUTO_SCROLL_STEP = 18

type ProductView = 'table' | 'order'

const statusOptions: Array<{ label: string; value: ProductStatus }> = [
  { label: 'Đang thực hiện', value: 'InProgress' },
  { label: 'Đã hoàn thành', value: 'Completed' },
]

type ProductStatusMultiSelectProps = {
  values: ProductStatus[]
  onChange: (values: ProductStatus[]) => void
}

function ProductStatusMultiSelect({ values, onChange }: ProductStatusMultiSelectProps) {
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

  const toggleValue = (value: ProductStatus) => {
    const nextValues = values.includes(value)
      ? values.filter((selectedValue) => selectedValue !== value)
      : [...values, value]

    onChange(statusOptions.filter((option) => nextValues.includes(option.value)).map(({ value }) => value))
  }

  return (
    <div className="product-list__multi-filter" ref={filterRef}>
      <button
        ref={triggerRef}
        className="product-list__multi-filter-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{values.length > 0 ? `Tiến độ · ${values.length}` : 'Tiến độ'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          className="product-list__multi-filter-options"
          role="listbox"
          aria-label="Lọc theo tiến độ"
          aria-multiselectable="true"
        >
          <div className="product-list__multi-filter-options-header">
            <span>Tiến độ</span>
            {values.length > 0 && (
              <button type="button" onClick={() => onChange([])}>
                Xóa chọn
              </button>
            )}
          </div>
          {statusOptions.map((option) => {
            const isSelected = values.includes(option.value)

            return (
              <button
                className={`product-list__multi-filter-option ${isSelected ? 'is-selected' : ''}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleValue(option.value)}
              >
                <span className="product-list__multi-filter-checkbox" aria-hidden="true">
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

function getStatusLabel(status: ProductStatus): string {
  return status === 'Completed' ? 'Đã hoàn thành' : 'Đang thực hiện'
}

function getStatusClassName(status: ProductStatus): string {
  return status === 'Completed' ? 'completed' : 'in-progress'
}

function formatDisplayOrder(displayOrder: number | null): string {
  if (displayOrder === null) return '—'
  return String(displayOrder).padStart(2, '0')
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || 'P'

  return `${parts[0]?.[0] || ''}${parts.at(-1)?.[0] || ''}`.toUpperCase()
}

function getOrderKey(items: OrderableProduct[]): string {
  return items.map((item) => item.id).join('|')
}

function reorderProducts(
  items: OrderableProduct[],
  sourceId: string,
  targetId: string,
): OrderableProduct[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items

  const nextItems = [...items]
  const [movedProduct] = nextItems.splice(sourceIndex, 1)

  if (!movedProduct) return items

  nextItems.splice(targetIndex, 0, movedProduct)
  return nextItems.map((item, index) => ({ ...item, displayOrder: index + 1 }))
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || fallback
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

function ProductListSkeleton() {
  return (
    <section className="product-list product-list--loading" aria-label="Đang tải danh sách sản phẩm">
      <div className="product-list__skeleton-heading">
        <Skeleton className="product-list__skeleton-title" />
        <Skeleton className="product-list__skeleton-create" />
      </div>
      <div className="product-list__skeleton-controls">
        <Skeleton className="product-list__skeleton-search" />
        <Skeleton className="product-list__skeleton-filter" />
        <Skeleton className="product-list__skeleton-filter" />
      </div>
      <Skeleton className="product-list__skeleton-table" />
    </section>
  )
}

type ProductViewTabsProps = {
  activeView: ProductView
  onChange: (view: ProductView) => void
}

function ProductViewTabs({ activeView, onChange }: ProductViewTabsProps) {
  return (
    <div className="product-list__tabs" role="tablist" aria-label="Chế độ xem sản phẩm">
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

type ProductTableViewProps = {
  data: PagedProductList
  isFetching: boolean
  page: number
  pageSize: number
  searchInput: string
  statuses: ProductStatus[]
  isPublished: boolean | undefined
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchInputChange: (value: string) => void
  onStatusesChange: (statuses: ProductStatus[]) => void
  onIsPublishedChange: (isPublished: boolean | undefined) => void
}

function ProductTableView({
  data,
  isFetching,
  page,
  pageSize,
  searchInput,
  statuses,
  isPublished,
  onPageChange,
  onPageSizeChange,
  onSearchInputChange,
  onStatusesChange,
  onIsPublishedChange,
}: ProductTableViewProps) {
  const navigate = useNavigate()
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null)
  const deleteConfirmation = useOverlayState()
  const deleteProduct = useDeleteProduct()

  const navigateToProduct = (path: string) => navigate(path)

  function requestDelete(product: ProductListItem) {
    deleteProduct.reset()
    setDeleteTarget(product)
    deleteConfirmation.open()
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteProduct.isPending || deleteTarget.canDelete !== true) return

    try {
      await deleteProduct.mutateAsync(deleteTarget.id)
      deleteConfirmation.close()
      setDeleteTarget(null)
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <>
      <div className="product-list__controls" aria-label="Bộ lọc sản phẩm">
        <label className="product-list__search">
          <Search aria-hidden="true" />
          <input
            type="search"
            maxLength={200}
            value={searchInput}
            placeholder="Tìm kiếm theo tên sản phẩm..."
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </label>

        <ProductStatusMultiSelect values={statuses} onChange={onStatusesChange} />

        <label className="product-list__status-filter">
          <span className="sr-only">Trạng thái đăng</span>
          <select
            value={isPublished === undefined ? '' : String(isPublished)}
            onChange={(event) =>
              onIsPublishedChange(
                event.target.value === '' ? undefined : event.target.value === 'true',
              )
            }
          >
            <option value="">Trạng thái đăng</option>
            <option value="true">Đã đăng</option>
            <option value="false">Chưa đăng</option>
          </select>
        </label>
      </div>

      <div
        className={`product-list__content ${isFetching ? 'product-list__content--refreshing' : ''}`}
        aria-busy={isFetching}
      >
        {isFetching && (
          <div className="product-list__table-loading" role="status">
            <span className="product-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}

        {data.items.length > 0 ? (
          <div className="product-list__table" role="table" aria-label="Danh sách sản phẩm">
            <div className="product-list__table-header" role="row">
              <span role="columnheader">Tên sản phẩm</span>
              <span role="columnheader">Mô tả ngắn</span>
              <span role="columnheader">Tiến độ</span>
              <span role="columnheader">Trạng thái đăng</span>
              <span className="sr-only" role="columnheader">
                Thao tác
              </span>
            </div>

            <div className="product-list__rows" role="rowgroup">
              {data.items.map((product) => (
                <div
                  className="product-list__row"
                  key={product.id}
                  role="row"
                >
                  <strong className="product-list__name" role="cell">
                    {product.name}
                  </strong>
                  <span className="product-list__summary" role="cell">
                    {product.summary || '—'}
                  </span>
                  <span role="cell">
                    <Chip
                      className={`product-list__progress product-list__progress--${getStatusClassName(product.status)}`}
                      color="default"
                      size="sm"
                      variant="secondary"
                    >
                      {getStatusLabel(product.status)}
                    </Chip>
                  </span>
                  <span role="cell">
                    <Chip
                      className={`product-list__publish product-list__publish--${
                        product.isPublished ? 'published' : 'unpublished'
                      }`}
                      color="default"
                      size="sm"
                      variant="secondary"
                    >
                      {product.isPublished ? 'Đã đăng' : 'Chưa đăng'}
                    </Chip>
                  </span>
                  <span role="cell">
                    <ProductRowActions
                      productId={product.id}
                      productName={product.name}
                      canDelete={product.canDelete}
                      deleteBlockedReason={product.deleteBlockedReason}
                      isOpen={openActionId === product.id}
                      onOpen={() => setOpenActionId(product.id)}
                      onClose={() => setOpenActionId(null)}
                      onNavigate={navigateToProduct}
                      onRequestDelete={() => requestDelete(product)}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="product-list__empty">Không tìm thấy sản phẩm phù hợp.</div>
        )}

        <footer className="product-list__pagination">
          <label className="product-list__page-size">
            <span>Số dòng/trang</span>
            <select
              aria-label="Số dòng mỗi trang"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="product-list__pagination-actions">
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
              <ChevronLeft size={18} />
            </Button>
            <span>
              Trang {data.totalPages === 0 ? 0 : data.page} / {data.totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              isIconOnly
              aria-label="Trang sau"
              isDisabled={data.totalPages === 0 || data.page >= data.totalPages || isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={18} />
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
        </footer>
      </div>
      <ProductDeleteConfirmationModal
        state={deleteConfirmation}
        productName={deleteTarget?.name ?? null}
        isPending={deleteProduct.isPending}
        errorMessage={deleteProduct.error ? getErrorMessage(deleteProduct.error, 'Không thể xóa sản phẩm. Vui lòng thử lại.') : null}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

type ProductRowActionsProps = {
  productId: string
  productName: string
  canDelete?: boolean
  deleteBlockedReason?: string | null
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (path: string) => void
  onRequestDelete: () => void
}

function ProductRowActions({
  productId,
  productName,
  canDelete = false,
  deleteBlockedReason,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: ProductRowActionsProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuId = `product-row-actions-${productId}`

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 132
    const menuWidth = 160
    const viewportPadding = 8
    const gap = 5
    const canOpenBelow = triggerRect.bottom + menuHeight + gap <= window.innerHeight - viewportPadding
    const top = canOpenBelow
      ? triggerRect.bottom + gap
      : Math.max(viewportPadding, triggerRect.top - menuHeight - gap)
    const left = Math.max(
      viewportPadding,
      Math.min(triggerRect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
    )

    setMenuPosition({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updateMenuPosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (actionsRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setMenuPosition(null)
      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuPosition(null)
      onClose()
      triggerRef.current?.focus()
    }

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
    <div ref={actionsRef} className="product-list__row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="product-list__row-actions-trigger"
        aria-label={`Thao tác với ${productName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          className="product-list__row-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              navigateTo(ROUTE_PATHS.PRODUCT_DETAIL.replace(':id', productId))
            }
          >
            <FileText size={14} aria-hidden="true" />
            Xem chi tiết
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              navigateTo(ROUTE_PATHS.PRODUCT_EDIT.replace(':id', productId))
            }
          >
            <Pencil size={14} aria-hidden="true" />
            Chỉnh sửa
          </button>
          <div className="product-list__row-actions-separator" role="separator" />
          <button
            type="button"
            className="product-list__row-actions-danger"
            role="menuitem"
            disabled={!canDelete}
            title={!canDelete ? deleteBlockedReason || 'Sản phẩm chưa thể xóa ở trạng thái hiện tại.' : undefined}
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

type ProductOrderViewProps = {
  enabled: boolean
}

function ProductOrderView({ enabled }: ProductOrderViewProps) {
  const orderQuery = useOrderableProducts(enabled)
  const reorderMutation = useReorderProducts()
  const trackRef = useRef<HTMLDivElement>(null)
  const [orderState, setOrderState] = useState<{
    sourceKey: string
    items: OrderableProduct[]
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
      <div className="product-order product-order--loading">
        <div className="product-order__toolbar">
          <Skeleton className="product-order__skeleton-save" />
        </div>
        <div className="product-order__skeleton-track">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="product-order__skeleton-card" key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (!orderQuery.data || orderQuery.error) {
    return (
      <div className="product-order__error">
        <p>{getErrorMessage(orderQuery.error, 'Không thể tải danh sách sắp xếp sản phẩm.')}</p>
        <Button type="button" variant="primary" onClick={() => void orderQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }

  const sourceProducts = orderQuery.data
  const sourceKey = getOrderKey(sourceProducts)
  const orderedProducts = orderState.sourceKey === sourceKey ? orderState.items : sourceProducts
  const hasOrderChanges = getOrderKey(orderedProducts) !== sourceKey

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, product: OrderableProduct) => {
    if (reorderMutation.isPending) {
      event.preventDefault()
      return
    }

    reorderMutation.reset()
    setNotice(null)
    setSaveError(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', product.id)
    setDraggingId(product.id)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, product: OrderableProduct) => {
    if (!draggingId || draggingId === product.id || reorderMutation.isPending) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverId(product.id)

    const track = trackRef.current
    if (!track) return

    const rect = track.getBoundingClientRect()
    if (event.clientX < rect.left + ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: -ORDER_AUTO_SCROLL_STEP })
    } else if (event.clientX > rect.right - ORDER_AUTO_SCROLL_EDGE) {
      track.scrollBy({ left: ORDER_AUTO_SCROLL_STEP })
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, product: OrderableProduct) => {
    event.preventDefault()
    const sourceId = draggingId || event.dataTransfer.getData('text/plain')

    if (sourceId) {
      setOrderState({
        sourceKey,
        items: reorderProducts(orderedProducts, sourceId, product.id),
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
      const savedProducts = await reorderMutation.mutateAsync({
        orderedProductIds: orderedProducts.map((product) => product.id),
      })
      setOrderState({ sourceKey: getOrderKey(savedProducts), items: savedProducts })
      setNotice({
        message: 'Đã lưu thứ tự hiển thị sản phẩm.',
        tone: 'success',
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const refetchResult = await orderQuery.refetch()

        if (refetchResult.isSuccess && refetchResult.data) {
          setOrderState({
            sourceKey: getOrderKey(refetchResult.data),
            items: refetchResult.data,
          })
          setNotice({
            message: 'Thứ tự sản phẩm đã thay đổi. Danh sách đã được tải lại.',
            tone: 'warning',
          })
        } else {
          setSaveError(
            getErrorMessage(error, 'Thứ tự sản phẩm đã thay đổi. Vui lòng tải lại danh sách.'),
          )
        }
        return
      }

      setSaveError(getErrorMessage(error, 'Không thể lưu thứ tự sản phẩm.'))
    }
  }

  return (
    <div className="product-order">
      <div className="product-order__toolbar">
        <Button
          className="product-list__save-order"
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
          className={`product-order__toast product-order__toast--${notice.tone}`}
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
        <p className="product-list__save-error" role="alert">
          {saveError}
        </p>
      )}

      {orderedProducts.length > 0 ? (
        <div
          ref={trackRef}
          className="product-order__track"
          role="list"
          aria-label="Thứ tự hiển thị sản phẩm"
        >
          {orderedProducts.map((product) => (
            <div
              className={`product-order__card ${
                draggingId === product.id ? 'product-order__card--dragging' : ''
              } ${dragOverId === product.id ? 'product-order__card--drag-over' : ''}`}
              key={product.id}
              role="listitem"
              draggable={!reorderMutation.isPending}
              aria-label={`${product.name}, thứ tự ${product.displayOrder}`}
              onDragStart={(event) => handleDragStart(event, product)}
              onDragOver={(event) => handleDragOver(event, product)}
              onDrop={(event) => handleDrop(event, product)}
              onDragEnd={resetDragState}
            >
              <div className="product-order__logo" aria-hidden="true">
                {product.logoUrl ? (
                  <img src={product.logoUrl} alt="" />
                ) : (
                  <span>{getInitials(product.name)}</span>
                )}
              </div>
              <strong className="product-order__name">{product.name}</strong>
              <div
                className="product-order__position"
                aria-label={`Thứ tự hiển thị ${formatDisplayOrder(product.displayOrder)}`}
              >
                <strong>{formatDisplayOrder(product.displayOrder)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="product-order__empty">Chưa có sản phẩm đang đăng để sắp xếp.</div>
      )}
    </div>
  )
}

export function ProductList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView: ProductView = searchParams.get('view') === 'order' ? 'order' : 'table'
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<ProductStatus[]>([])
  const [isPublished, setIsPublished] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const handleViewChange = (view: ProductView) => {
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

  const productsQuery = useProducts({
    search: search || undefined,
    status: statuses,
    isPublished,
    page,
    pageSize,
  })

  useEffect(() => {
    const data = productsQuery.data
    if (
      productsQuery.isPlaceholderData ||
      !data ||
      data.totalPages === 0 ||
      data.items.length > 0 ||
      page <= data.totalPages
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => setPage(data.totalPages), 0)
    return () => window.clearTimeout(timeoutId)
  }, [page, productsQuery.data, productsQuery.isPlaceholderData])

  if (activeView === 'table' && productsQuery.isPending) {
    return <ProductListSkeleton />
  }

  const isReturningToProductList = location.state?.productNavigation === 'back-to-list'

  return (
    <section className="product-list">
      <div
        className={`product-list__page-content ${
          isReturningToProductList ? 'product-list__page-content--back-enter' : ''
        }`}
      >
        <header className="product-list__heading">
          <h1>Quản lý sản phẩm</h1>
          <Button
            className="product-list__create"
            type="button"
            variant="primary"
            onClick={() => navigate(ROUTE_PATHS.PRODUCT_CREATE)}
          >
            <Plus size={16} aria-hidden="true" />
            Tạo sản phẩm
          </Button>
        </header>

        {activeView === 'table' ? (
          !productsQuery.data || productsQuery.error ? (
            <div className="product-list__inline-error">
              <p>{getErrorMessage(productsQuery.error, 'Không thể tải danh sách sản phẩm.')}</p>
              <Button type="button" variant="primary" onClick={() => void productsQuery.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : (
            <ProductTableView
              data={productsQuery.data}
              isFetching={productsQuery.isFetching}
              page={page}
              pageSize={pageSize}
              searchInput={searchInput}
              statuses={statuses}
              isPublished={isPublished}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize)
                setPage(1)
              }}
              onSearchInputChange={setSearchInput}
              onStatusesChange={(nextStatuses) => {
                setStatuses(nextStatuses)
                setPage(1)
              }}
              onIsPublishedChange={(nextIsPublished) => {
                setIsPublished(nextIsPublished)
                setPage(1)
              }}
            />
          )
        ) : (
          <ProductOrderView enabled={activeView === 'order'} />
        )}
      </div>

      <ProductViewTabs activeView={activeView} onChange={handleViewChange} />
    </section>
  )
}
