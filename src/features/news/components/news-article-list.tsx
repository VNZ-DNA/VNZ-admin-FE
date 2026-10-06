import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

import { useNewsArticles } from '@/features/news/hooks/use-news-articles'
import { useDeleteNewsArticle } from '@/features/news/hooks/use-delete-news-article'
import { useNewsCategories } from '@/features/news/hooks/use-news-categories'
import { NewsDeleteConfirmationModal } from '@/features/news/components/news-delete-confirmation-modal'
import type { NewsArticleListItem, NewsStatusFilter } from '@/features/news/types'
import { getNewsMutationErrorMessage } from '@/features/news/utils/news-media'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const SEARCH_DEBOUNCE_MS = 350
const PAGE_SIZE_OPTIONS = [10, 20, 50]

const statusOptions: Array<{ label: string; value: NewsStatusFilter }> = [
  { label: 'Bản nháp', value: 'Draft' },
  { label: 'Đã đăng', value: 'Published' },
  { label: 'Đã đóng', value: 'Closed' },
]

type MultiSelectOption = {
  label: string
  value: string
}
type NewsMultiSelectFilterProps = {
  label: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}

function NewsMultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  disabled = false,
}: NewsMultiSelectFilterProps) {
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
        disabled={disabled}
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
          {options.length > 0 ? (
            options.map((option) => {
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
            })
          ) : (
            <p className="news-list__multi-empty">Chưa có dữ liệu</p>
          )}
        </div>
      )}
    </div>
  )
}
type NewsRowActionsProps = {
  articleId: string
  articleTitle: string
  isEditableStatus: boolean
  canDelete?: boolean
  deleteBlockedReason?: string | null
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (path: string) => void
  onRequestDelete: () => void
}

function NewsRowActions({
  articleId,
  articleTitle,
  isEditableStatus,
  canDelete = false,
  deleteBlockedReason,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
  onRequestDelete,
}: NewsRowActionsProps) {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateMenuPosition = useCallback(() => {
    const triggerElement = actionsRef.current
    const triggerRect = triggerElement?.getBoundingClientRect()
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
    const menuHeight = isEditableStatus ? 132 : 100
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
  }, [isEditableStatus, onClose])

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
    <div ref={actionsRef} className="news-list__row-actions">
      <button
        type="button"
        className="news-list__row-actions-trigger"
        aria-label={`Thao tác với ${articleTitle}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="news-list__row-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button type="button" role="menuitem" onClick={() => navigateTo(ROUTE_PATHS.NEWS_DETAIL.replace(':id', articleId))}>
            <FileText size={14} aria-hidden="true" />
            Xem chi tiết
          </button>
          {isEditableStatus && (
            <button type="button" role="menuitem" onClick={() => navigateTo(ROUTE_PATHS.NEWS_EDIT.replace(':id', articleId))}>
              <Pencil size={14} aria-hidden="true" />
              Chỉnh sửa
            </button>
          )}
          <div className="news-list__row-actions-separator" role="separator" />
          <button
            type="button"
            className="news-list__row-actions-danger"
            role="menuitem"
            disabled={!canDelete}
            title={!canDelete ? deleteBlockedReason || 'Bài viết chưa thể xóa ở trạng thái hiện tại.' : undefined}
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
function formatDate(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getStatusClassName(status: string): string {
  if (status === 'Đã đăng') return 'published'
  if (status === 'Bản nháp') return 'draft'
  if (status === 'Đã đóng') return 'closed'
  return 'unknown'
}

function isNewsEditableStatus(status: string): boolean {
  const normalizedStatus = status.trim().toLocaleLowerCase('vi-VN')

  return normalizedStatus !== 'đã đóng' && normalizedStatus !== 'closed'
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.data?.errors?.code === 'NEWS_QUERY_INVALID') {
      return 'Bộ lọc bài viết không hợp lệ. Vui lòng kiểm tra lại lựa chọn.'
    }

    return error.response?.data?.message || 'Không thể tải danh sách bài viết.'
  }

  return 'Không thể tải danh sách bài viết.'
}

function NewsArticleListSkeleton() {
  return (
    <section className="news-list news-list--loading" aria-label="Đang tải danh sách bài viết">
      <div className="news-list__skeleton-heading">
        <Skeleton className="news-list__skeleton-title" />
        <Skeleton className="news-list__skeleton-create" />
      </div>
      <div className="news-list__skeleton-filters">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <Skeleton className="news-list__skeleton-table" />
    </section>
  )
}

export function NewsArticleList() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<NewsStatusFilter[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NewsArticleListItem | null>(null)
  const deleteConfirmation = useOverlayState()
  const deleteNewsArticle = useDeleteNewsArticle()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const articlesQuery = useNewsArticles({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    page,
    pageSize,
  })
  const categoriesQuery = useNewsCategories()
  const data = articlesQuery.data

  function requestDelete(article: NewsArticleListItem) {
    deleteNewsArticle.reset()
    setDeleteTarget(article)
    deleteConfirmation.open()
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteNewsArticle.isPending || deleteTarget.canDelete !== true) return

    try {
      await deleteNewsArticle.mutateAsync(deleteTarget.id)
      deleteConfirmation.close()
      setDeleteTarget(null)
    } catch {
      // Keep the modal open so the backend error remains visible in context.
    }
  }

  useEffect(() => {
    if (!data || data.totalItems === 0 || data.totalPages === 0 || data.items.length > 0 || page <= data.totalPages) return

    const timeoutId = window.setTimeout(() => setPage(data.totalPages), 0)

    return () => window.clearTimeout(timeoutId)
  }, [data, page])

  if (articlesQuery.isPending) {
    return <NewsArticleListSkeleton />
  }

  if (!data || articlesQuery.error) {
    return (
      <section className="news-list__error">
        <h1>Quản lý bài viết</h1>
        <p>{getErrorMessage(articlesQuery.error)}</p>
        <Button type="button" variant="primary" onClick={() => void articlesQuery.refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const displayPage = data.totalPages === 0 ? 0 : data.page

  return (
      <section className={`news-list ${location.state?.newsNavigation === 'back-to-list' ? 'news-list--back-enter' : ''}`}>
      <header className="news-list__heading">
        <h1>Quản lý bài viết</h1>
        <div className="news-list__heading-actions">
          <Button
            className="news-list__create"
            type="button"
            variant="primary"
            aria-label="Thêm bài viết mới"
            onClick={() => navigate(ROUTE_PATHS.NEWS_CREATE)}
          >
            <Plus size={16} aria-hidden="true" />
            Thêm bài viết mới
          </Button>
        </div>
      </header>

      <div className="news-list__filters" aria-label="Bộ lọc bài viết">
        <label className="news-list__search">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            value={searchInput}
            placeholder="Tìm kiếm theo tiêu đề..."
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <NewsMultiSelectFilter
          label="Trạng thái"
          options={statusOptions}
          selectedValues={selectedStatuses}
          onChange={(values) => {
            setSelectedStatuses(values as NewsStatusFilter[])
            setPage(1)
          }}
        />

        <NewsMultiSelectFilter
          label="Thể loại"
          options={
            categoriesQuery.data?.map((category) => ({
              label: category.name,
              value: category.id,
            })) ?? []
          }
          selectedValues={selectedCategoryIds}
          disabled={categoriesQuery.isPending || Boolean(categoriesQuery.error)}
          onChange={(values) => {
            setSelectedCategoryIds(values)
            setPage(1)
          }}
        />
      </div>

      {categoriesQuery.error && (
        <div className="news-list__category-error" role="alert">
          <span>Không thể tải thể loại để lọc.</span>
          <Button type="button" variant="ghost" onClick={() => void categoriesQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      <div
        className={`news-list__content ${articlesQuery.isFetching ? 'news-list__content--refreshing' : ''}`}
        aria-busy={articlesQuery.isFetching}
      >
        {articlesQuery.isFetching && (
          <div className="news-list__table-loading" role="status">
            <span className="news-list__table-loading-dot" aria-hidden="true" />
            Đang tải dữ liệu...
          </div>
        )}
        {data.items.length > 0 ? (
          <div className="news-list__table-scroll">
            <table className="news-list__table" aria-label="Danh sách bài viết">
              <thead>
                <tr>
                  <th scope="col">Tiêu đề</th>
                  <th scope="col">Tác giả</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Ngày đăng</th>
                  <th scope="col">Thể loại</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="news-list__actions-heading"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((article) => (
                  <tr key={article.id} className="news-list__row">
                    <td>
                      <span className="news-list__title">{article.title}</span>
                    </td>
                    <td>{article.authorName}</td>
                    <td>{formatDate(article.createdAt)}</td>
                    <td>{formatDate(article.publishAt)}</td>
                    <td>
                      <span className="news-list__categories">
                        {article.categories.length > 0
                          ? article.categories.map((category) => category.name).join(', ')
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <Chip
                        className={`news-list__status news-list__status--${getStatusClassName(article.status)}`}
                        color="default"
                        size="sm"
                        variant="secondary"
                      >
                        {article.status}
                      </Chip>
                    </td>
                    <td className="news-list__actions-cell">
                      <NewsRowActions
                        articleId={article.id}
                        articleTitle={article.title}
                        isEditableStatus={isNewsEditableStatus(article.status)}
                        canDelete={article.canDelete}
                        deleteBlockedReason={article.deleteBlockedReason}
                        isOpen={openActionId === article.id}
                        onOpen={() => setOpenActionId(article.id)}
                        onClose={() => setOpenActionId(null)}
                        onNavigate={navigate}
                        onRequestDelete={() => requestDelete(article)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="news-list__empty">
            <p>Không tìm thấy bài viết phù hợp.</p>
          </div>
        )}

        <footer className="news-list__pagination">
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
                isDisabled={data.page <= 1 || articlesQuery.isFetching}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang trước"
                isDisabled={data.page <= 1 || articlesQuery.isFetching}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang sau"
                isDisabled={data.totalPages === 0 || data.page >= data.totalPages || articlesQuery.isFetching}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                <ChevronRight size={17} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                aria-label="Trang cuối"
                isDisabled={data.totalPages === 0 || data.page >= data.totalPages || articlesQuery.isFetching}
                onClick={() => setPage(data.totalPages)}
              >
                <ChevronsRight size={17} />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <NewsDeleteConfirmationModal
        state={deleteConfirmation}
        articleTitle={deleteTarget?.title ?? null}
        isPending={deleteNewsArticle.isPending}
        errorMessage={deleteNewsArticle.error ? getNewsMutationErrorMessage(deleteNewsArticle.error, 'Không thể xóa bài viết. Vui lòng thử lại.') : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
