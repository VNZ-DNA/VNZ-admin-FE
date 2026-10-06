import { Button, Chip, Modal, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { RichTextContent } from '@/features/news/components/rich-text-content'
import { NewsDeleteConfirmationModal } from '@/features/news/components/news-delete-confirmation-modal'
import { useNewsArticleDetail } from '@/features/news/hooks/use-news-article-detail'
import { useDeleteNewsArticle } from '@/features/news/hooks/use-delete-news-article'
import { useUpdateNewsArticle } from '@/features/news/hooks/use-update-news-article'
import type { CloseNewsArticleRequest, UpdateNewsArticleContentRequest } from '@/features/news/types'
import { selectNewsContent } from '@/features/news/utils/news-content-locale'
import { getNewsCategoryLabel, getNewsStatusLabel } from '@/features/news/utils/news-labels'
import { getNewsMutationErrorDetails } from '@/features/news/utils/news-mutation-error'
import type { ContentLocale } from '@/lib/content-locale'
import { getNewsMutationErrorMessage } from '@/features/news/utils/news-media'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function formatDateTime(value: string | null): string {
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
  if (status === 'Published' || status === 'Đã đăng') return 'published'
  if (status === 'Draft' || status === 'Bản nháp') return 'draft'
  if (status === 'Closed' || status === 'Đã đóng') return 'closed'
  return 'unknown'
}

function isNewsEditableStatus(status: string): boolean {
  const normalizedStatus = status.trim().toLocaleLowerCase('vi-VN')

  return normalizedStatus !== 'đã đóng' && normalizedStatus !== 'closed'
}

function getErrorContent(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Không tìm thấy bài viết',
        message: error.response.data?.message || 'Bài viết này không tồn tại hoặc đã bị xóa.',
      }
    }

    if (error.response?.status === 400) {
      return {
        title: 'Mã bài viết không hợp lệ',
        message: error.response.data?.message || 'Không thể mở bài viết với mã hiện tại.',
      }
    }

    return {
      title: 'Không thể tải chi tiết bài viết',
      message: error.response?.data?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
    }
  }

  return {
    title: 'Không thể tải chi tiết bài viết',
    message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
  }
}

function NewsArticleDetailSkeleton() {
  return (
    <section className="news-detail news-detail--loading" aria-label="Đang tải chi tiết bài viết">
      <Skeleton className="news-detail__skeleton-breadcrumb" />
      <div className="news-detail__skeleton-heading">
        <Skeleton className="news-detail__skeleton-title" />
        <div className="news-detail__skeleton-actions">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
      <div className="news-detail__layout">
        <Skeleton className="news-detail__skeleton-content" />
        <Skeleton className="news-detail__skeleton-info" />
      </div>
    </section>
  )
}

function getActionErrorMessage(error: unknown): string {
  if (getNewsMutationErrorDetails(error).isConflict) {
    return 'Bài viết đã được cập nhật ở nơi khác. Hãy tải dữ liệu mới và kiểm tra lại trước khi thực hiện thao tác.'
  }
  return getNewsMutationErrorMessage(error, 'Không thể cập nhật trạng thái bài viết.')
}

function NewsActionError({ error, className, isReloading, onReload }: {
  error: unknown
  className: string
  isReloading: boolean
  onReload: () => void
}) {
  return (
    <div className={className} role="alert">
      <p>{getActionErrorMessage(error)}</p>
      {getNewsMutationErrorDetails(error).isConflict && (
        <Button className="news-detail__reload" type="button" variant="outline" isDisabled={isReloading} onClick={onReload}>
          {isReloading ? 'Đang tải...' : 'Tải dữ liệu mới'}
        </Button>
      )}
    </div>
  )
}

function getDeleteErrorMessage(error: unknown): string {
  return getNewsMutationErrorMessage(error, 'Không thể xóa bài viết. Vui lòng thử lại.')
}

type NewsArticleDetailProps = {
  id: string
}

export function NewsArticleDetail({ id }: NewsArticleDetailProps) {
  const navigate = useNavigate()
  const closeConfirmation = useOverlayState()
  const deleteConfirmation = useOverlayState()
  const updateNewsArticle = useUpdateNewsArticle(id)
  const deleteNewsArticle = useDeleteNewsArticle()
  const { data, error, isPending, refetch } = useNewsArticleDetail(id)
  const [contentLocale, setContentLocale] = useState<ContentLocale>('vi')
  const [isReloading, setIsReloading] = useState(false)
  const { isConflict, errorLocales } = getNewsMutationErrorDetails(updateNewsArticle.error)
  const actionsDisabled = updateNewsArticle.isPending || deleteNewsArticle.isPending || isReloading || isConflict

  async function reloadArticle() {
    if (isReloading) return

    setIsReloading(true)
    try {
      const result = await refetch()
      if (!result.isError) {
        updateNewsArticle.reset()
        closeConfirmation.close()
      }
    } finally {
      setIsReloading(false)
    }
  }

  if (isPending) {
    return <NewsArticleDetailSkeleton />
  }

  if (!data || error) {
    const errorContent = getErrorContent(error)

    return (
      <section className="news-detail__error">
        <h1>{errorContent.title}</h1>
        <p>{errorContent.message}</p>
        <div className="news-detail__error-actions">
          <Button type="button" variant="primary" isDisabled={isReloading} onClick={() => void reloadArticle()}>
            {isReloading ? 'Đang tải...' : 'Thử lại'}
          </Button>
          <Link className="news-detail__back-link" to={ROUTE_PATHS.NEWS} state={{ newsNavigation: 'back-to-list' }}>
            Quay lại danh sách
          </Link>
        </div>
      </section>
    )
  }

  const article = data
  const categories = data.categories.length > 0
    ? data.categories.map((category) => getNewsCategoryLabel(category.name)).join(', ')
    : '—'
  const canEdit = data.actions.includes('Edit') && isNewsEditableStatus(data.status)
  const canPublish = data.actions.includes('Publish')
  const canClose = data.actions.includes('Close')
  const canDelete = data.canDelete === true
  const deleteBlockedReason = data.deleteBlockedReason === 'PUBLIC_VISIBLE'
    ? 'Bài viết đang hiển thị công khai. Hãy đóng bài viết trước khi xóa.'
    : undefined
  const updatedAt = formatDateTime(data.updatedAt)
  const displayedContent = selectNewsContent(data, contentLocale)
  const isEnglishEmpty = contentLocale === 'en' && !data.translations?.en

  function buildPublishPayload(): UpdateNewsArticleContentRequest {
    return {
      title: article.title,
      summary: article.summary,
      content: article.content,
      categoryIds: article.categories.map((category) => category.id),
      status: 'Published',
      translations: article.translations,
      expectedUpdatedAt: article.updatedAtUtc,
    }
  }

  async function publishArticle() {
    if (actionsDisabled) return

    updateNewsArticle.reset()

    try {
      await updateNewsArticle.mutateAsync(buildPublishPayload())
    } catch (mutationError) {
      const locales = getNewsMutationErrorDetails(mutationError).errorLocales
      if (locales.length > 0) setContentLocale(locales[0])
    }
  }

  async function confirmClose() {
    if (actionsDisabled) return

    try {
      const payload: CloseNewsArticleRequest = {
        status: 'Closed',
        expectedUpdatedAt: article.updatedAtUtc,
      }
      await updateNewsArticle.mutateAsync(payload)
      closeConfirmation.close()
    } catch {
      // Keep the modal open so the backend error remains visible in context.
    }
  }

  async function confirmDelete() {
    if (deleteNewsArticle.isPending || !canDelete) return

    try {
      await deleteNewsArticle.mutateAsync(article.id)
      deleteConfirmation.close()
      navigate(ROUTE_PATHS.NEWS, { state: { newsNavigation: 'back-to-list' } })
    } catch {
      // Keep the modal open so the backend error remains visible in context.
    }
  }

  return (
    <section className="news-detail">
      <nav className="news-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.NEWS} state={{ newsNavigation: 'back-to-list' }}>Tin tức</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết bài viết</span>
      </nav>

      <header className="news-detail__heading news-detail__heading--actions-only">
        <div className="news-detail__toolbar" aria-label="Thao tác bài viết">
          {canPublish && (
            <Button
              className="news-detail__action news-detail__action--publish"
              type="button"
              variant="primary"
              isDisabled={actionsDisabled}
              onClick={() => void publishArticle()}
            >
              {updateNewsArticle.isPending ? 'Đang đăng...' : 'Đăng'}
            </Button>
          )}
          {canClose && (
            <Button
              className="news-detail__action news-detail__action--close"
              type="button"
              variant="outline"
              isDisabled={actionsDisabled}
              onClick={() => {
                updateNewsArticle.reset()
                closeConfirmation.open()
              }}
            >
              Đóng
            </Button>
          )}
          {canEdit && (
            <Button
              className="news-detail__action news-detail__action--edit"
              type="button"
              variant="secondary"
              isDisabled={actionsDisabled}
              onClick={() => navigate(ROUTE_PATHS.NEWS_EDIT.replace(':id', data.id))}
            >
              Chỉnh sửa
            </Button>
          )}
          <Button
            className="news-detail__action news-detail__action--delete"
            type="button"
            variant="outline"
            isDisabled={!canDelete || actionsDisabled}
            aria-label={deleteBlockedReason || 'Xóa bài viết'}
            onClick={() => {
              deleteNewsArticle.reset()
              deleteConfirmation.open()
            }}
          >
            Xóa
          </Button>
        </div>
      </header>

      {updateNewsArticle.error && !closeConfirmation.isOpen && (
        <NewsActionError
          error={updateNewsArticle.error}
          className="news-detail__action-error"
          isReloading={isReloading}
          onReload={() => void reloadArticle()}
        />
      )}

      <div className="news-detail__layout">
        <BilingualContentCard
          className="news-detail__article-card"
          value={contentLocale}
          onChange={setContentLocale}
          errorLocales={errorLocales}
        >
          <h1 className="news-detail__article-title">
            {displayedContent.title ?? (contentLocale === 'en' ? 'Chưa có tiêu đề English' : 'Chưa có tiêu đề')}
          </h1>
          {data.imageUrl && (
            <div className="news-detail__cover">
              <img src={data.imageUrl} alt={`Ảnh đại diện bài viết ${displayedContent.title ?? ''}`} />
            </div>
          )}
          {isEnglishEmpty ? (
            <p className="news-detail__translation-empty">Bản nháp này chưa có nội dung English.</p>
          ) : (
            <>
              {displayedContent.summary && <RichTextContent html={displayedContent.summary} className="news-detail__summary" />}
              <RichTextContent html={displayedContent.content} className="news-detail__content" />
            </>
          )}

          {data.updatedAt && (
            <p className="news-detail__updated-note">
              Nội dung được cập nhật lần cuối {updatedAt}.
            </p>
          )}
        </BilingualContentCard>

        <aside className="news-detail__sidebar">
          <section className="news-detail__info-card">
            <h2>Thông tin bài viết</h2>
            <dl className="news-detail__info-list">
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <Chip
                    className={`news-detail__status news-detail__status--${getStatusClassName(data.status)}`}
                    color="default"
                    size="sm"
                    variant="secondary"
                  >
                    {getNewsStatusLabel(data.status)}
                  </Chip>
                </dd>
              </div>
              <div>
                <dt>Tác giả</dt>
                <dd>{data.authorName}</dd>
              </div>
              <div>
                <dt>Thể loại</dt>
                <dd>{categories}</dd>
              </div>
              <div>
                <dt>Ngày đăng</dt>
                <dd>{formatDateTime(data.publishAt)}</dd>
              </div>
              <div>
                <dt>Ngày cập nhật</dt>
                <dd>{updatedAt}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <Modal.Root state={closeConfirmation}>
        <Modal.Backdrop className="news-close__backdrop" isDismissable={!updateNewsArticle.isPending}>
          <Modal.Container className="news-close__container" placement="center" size="md">
            <Modal.Dialog className="news-close__dialog">
              <Modal.Header className="news-close__header">
                <Modal.Icon className="news-close__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <Modal.Heading className="news-close__heading">
                  Xác nhận đóng bài viết?
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="news-close__body">
                <p>
                  Sau khi đóng, bài “{data.title}” sẽ không còn hiển thị công khai và không thể chỉnh sửa hoặc đăng lại.
                </p>
                {updateNewsArticle.error && (
                  <NewsActionError
                    error={updateNewsArticle.error}
                    className="news-close__error"
                    isReloading={isReloading}
                    onReload={() => void reloadArticle()}
                  />
                )}
              </Modal.Body>

              <Modal.Footer className="news-close__footer">
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={updateNewsArticle.isPending}
                  onClick={() => closeConfirmation.close()}
                >
                  Hủy
                </Button>
                <Button
                  className="news-close__submit"
                  type="button"
                  variant="primary"
                  isDisabled={actionsDisabled}
                  onClick={() => void confirmClose()}
                >
                  {updateNewsArticle.isPending ? 'Đang đóng...' : 'Đóng bài viết'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <NewsDeleteConfirmationModal
        state={deleteConfirmation}
        articleTitle={data.title ?? '—'}
        isPending={deleteNewsArticle.isPending}
        errorMessage={deleteNewsArticle.error ? getDeleteErrorMessage(deleteNewsArticle.error) : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
