import { Button, Chip, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { RichTextContent } from '@/features/news/components/rich-text-content'
import { ProductDeleteConfirmationModal } from '@/features/products/components/product-delete-confirmation-modal'
import { ProductLogoPreview } from '@/features/products/components/product-logo-preview'
import { useDeleteProduct } from '@/features/products/hooks/use-delete-product'
import { useProductDetail } from '@/features/products/hooks/use-product-detail'
import { sanitizeProductRichText } from '@/features/products/product-rich-text'
import { selectProductContent } from '@/features/products/utils/product-content-locale'
import type { ProductContentBlock, ProductStatus } from '@/features/products/types'
import type { ContentLocale } from '@/lib/content-locale'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

function getStatusLabel(status: ProductStatus): string {
  return status === 'Completed' ? 'Đã hoàn thành' : 'Đang thực hiện'
}

function getStatusClassName(status: ProductStatus): string {
  return status === 'Completed' ? 'completed' : 'in-progress'
}

function getDescription(blocks: ProductContentBlock[]): string | null {
  return blocks.find((block) => block.type === 'Description' && block.text?.trim())?.text?.trim() ?? null
}

function getDetailError(error: unknown): { title: string; message: string } {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) {
      return {
        title: 'Không tìm thấy sản phẩm',
        message: error.response.data?.message || 'Sản phẩm này không tồn tại.',
      }
    }

    return {
      title: 'Không thể tải chi tiết sản phẩm',
      message: error.response?.data?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
    }
  }

  return {
    title: 'Không thể tải chi tiết sản phẩm',
    message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.',
  }
}

function getDeleteErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.'
  }

  if (error instanceof Error && error.message) return error.message
  return 'Không thể xóa sản phẩm. Vui lòng thử lại.'
}

function ProductContent({ blocks }: { blocks: ProductContentBlock[] }) {
  const sortedBlocks = [...blocks].sort((first, second) => first.order - second.order)

  if (sortedBlocks.length === 0) {
    return <p className="product-detail__content-empty">Chưa có nội dung sản phẩm.</p>
  }

  return (
    <div className="product-detail__content-body">
      {sortedBlocks.map((block) => {
        if (block.type === 'Title') {
          return block.text?.trim() ? (
            <RichTextContent
              key={block.id}
              html={sanitizeProductRichText(block.text)}
              className="product-detail__rich-text product-detail__rich-text--title"
            />
          ) : null
        }

        if (block.type === 'Description') {
          return block.text?.trim() ? (
            <RichTextContent
              key={block.id}
              html={sanitizeProductRichText(block.text)}
              className="product-detail__rich-text product-detail__description-block"
            />
          ) : null
        }

        if (block.type === 'Category') {
          return block.text?.trim() ? (
            <RichTextContent
              key={block.id}
              html={sanitizeProductRichText(block.text)}
              className="product-detail__rich-text product-detail__rich-text--category"
            />
          ) : null
        }

        if (block.type === 'Feature' && block.items && block.items.length > 0) {
          return (
            <ul className="product-detail__feature-list" key={block.id}>
              {block.items.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          )
        }

        return null
      })}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <section className="product-detail product-detail--loading" aria-label="Đang tải chi tiết sản phẩm">
      <Skeleton className="product-detail__skeleton-breadcrumb" />
      <Skeleton className="product-detail__skeleton-summary" />
      <Skeleton className="product-detail__skeleton-content" />
    </section>
  )
}

type ProductDetailProps = {
  id: string
}

export function ProductDetail({ id }: ProductDetailProps) {
  const navigate = useNavigate()
  const productQuery = useProductDetail(id)
  const deleteConfirmation = useOverlayState()
  const deleteProduct = useDeleteProduct()
  const [contentLocale, setContentLocale] = useState<ContentLocale>('vi')

  if (productQuery.isPending) {
    return <ProductDetailSkeleton />
  }

  if (!productQuery.data || productQuery.error) {
    const error = getDetailError(productQuery.error)

    return (
      <section className="product-detail__error">
        <h1>{error.title}</h1>
        <p>{error.message}</p>
        <Button type="button" variant="primary" onClick={() => void productQuery.refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const product = productQuery.data
  const selectedContent = selectProductContent(product, contentLocale)
  const blocks = selectedContent?.blocks ?? []
  const description = getDescription(product.content?.blocks ?? [])
  const isEnglishEmpty = contentLocale === 'en' && selectedContent === null
  const canDelete = product.canDelete === true
  const deleteBlockedReason = product.deleteBlockedReason === 'PUBLIC_VISIBLE'
    ? 'Sản phẩm đang hiển thị công khai. Hãy gỡ đăng trước khi xóa.'
    : undefined

  async function confirmDelete() {
    if (deleteProduct.isPending || !canDelete) return

    try {
      await deleteProduct.mutateAsync(product.id)
      deleteConfirmation.close()
      navigate(ROUTE_PATHS.PRODUCTS, { state: { productNavigation: 'back-to-list' } })
    } catch {
      // Giữ modal mở để hiển thị lỗi từ backend trong đúng ngữ cảnh.
    }
  }

  return (
    <section className="product-detail">
      <nav className="product-detail__breadcrumb" aria-label="Breadcrumb">
        <Link
          to={ROUTE_PATHS.PRODUCTS}
          state={{ productNavigation: 'back-to-list' }}
        >
          Sản phẩm
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chi tiết sản phẩm</span>
      </nav>

      <header className="product-detail__heading product-detail__heading--actions-only">
        <div className="product-detail__toolbar" aria-label="Thao tác sản phẩm">
          <Button
            className="product-detail__action product-detail__action--edit"
            type="button"
            variant="secondary"
            isDisabled={deleteProduct.isPending}
            onClick={() => navigate(ROUTE_PATHS.PRODUCT_EDIT.replace(':id', product.id))}
          >
            Chỉnh sửa
          </Button>
          <Button
            className="product-detail__action product-detail__action--delete"
            type="button"
            variant="outline"
            isDisabled={!canDelete || deleteProduct.isPending}
            aria-label={deleteBlockedReason || 'Xóa sản phẩm'}
            onClick={() => {
              deleteProduct.reset()
              deleteConfirmation.open()
            }}
          >
            Xóa
          </Button>
        </div>
      </header>

      {deleteProduct.error && !deleteConfirmation.isOpen && (
        <p className="product-detail__action-error" role="alert">
          {getDeleteErrorMessage(deleteProduct.error)}
        </p>
      )}

      <BilingualContentCard
        className="product-detail__sheet product-detail__bilingual-sheet"
        value={contentLocale}
        onChange={setContentLocale}
      >
        <section className="product-detail__summary-card">
          <div className="product-detail__summary-main">
            <ProductLogoPreview src={product.logoUrl} alt={`Logo ${product.name}`} compact />
            <div>
              <strong>{product.name}</strong>
              {description ? (
                <RichTextContent
                  html={description}
                  className="product-detail__summary-description product-detail__rich-text"
                />
              ) : (
                <p>Chưa có mô tả sản phẩm.</p>
              )}
            </div>
          </div>
          <div className="product-detail__status-stack" aria-label="Trạng thái sản phẩm">
            <Chip
              className={`product-detail__status product-detail__status--${getStatusClassName(product.status)}`}
              color="default"
              size="sm"
              variant="secondary"
            >
              {getStatusLabel(product.status)}
            </Chip>
            <Chip
              className={`product-detail__status product-detail__status--${product.isPublished ? 'published' : 'unpublished'}`}
              color="default"
              size="sm"
              variant="secondary"
            >
              {product.isPublished ? 'Đã đăng' : 'Chưa đăng'}
            </Chip>
          </div>
        </section>

        <div className="product-detail__detail-columns">
          <div className="product-detail__assets-column">
            <dl className="product-detail__info-list">
              <div className="product-detail__asset-field">
                <div className="product-detail__asset-preview">
                  <ProductLogoPreview src={product.logoUrl} alt={`Preview logo ${product.name}`} />
                </div>
              </div>

              <div className="product-detail__asset-field">
                <div className="product-detail__info-field">
                  <dt>Wordmark URL</dt>
                  <dd>
                    {product.wordmarkUrl ? (
                      <a href={product.wordmarkUrl} target="_blank" rel="noreferrer">
                        {product.wordmarkUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="product-detail__asset-preview product-detail__asset-preview--wordmark">
                  <ProductLogoPreview src={product.wordmarkUrl} alt={`Preview wordmark ${product.name}`} />
                </div>
              </div>

              <div className="product-detail__info-field">
                <dt>Product URL</dt>
                <dd>
                  {product.productUrl ? (
                    <a href={product.productUrl} target="_blank" rel="noreferrer">
                      {product.productUrl}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <section className="product-detail__content-section">
            <h2>Content</h2>
            {isEnglishEmpty ? (
              <p className="product-detail__translation-empty">Bản nháp này chưa có nội dung English.</p>
            ) : (
              <ProductContent blocks={blocks} />
            )}
          </section>
        </div>
      </BilingualContentCard>

      <ProductDeleteConfirmationModal
        state={deleteConfirmation}
        productName={product.name}
        isPending={deleteProduct.isPending}
        errorMessage={deleteProduct.error ? getDeleteErrorMessage(deleteProduct.error) : null}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
