import { Button, Chip, Modal, Skeleton, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState, type DragEvent, type KeyboardEvent } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import { ProductLogoPreview } from '@/features/products/components/product-logo-preview'
import { ProductMediaManager } from '@/features/products/components/product-media-manager'
import { useProductDetail } from '@/features/products/hooks/use-product-detail'
import { useUpdateProduct } from '@/features/products/hooks/use-update-product'
import {
  buildProductMediaMutation,
  createProductMediaDraft,
  hasFinalProductMedia,
  isProductMediaDirty,
  type ProductMediaDraft,
} from '@/features/products/product-media'
import { reorderProductContentBlocks } from '@/features/products/product-content-blocks'
import {
  buildBilingualProductContent,
  createLocalizedProductBlocks,
  getProductContentErrorLocales,
  type LocalizedProductBlocks,
  type ProductEditorBlock,
} from '@/features/products/utils/product-content-form'
import type { ProductDetail, ProductStatus, UpdateProductFormRequest } from '@/features/products/types'
import type { ApiResponse } from '@/lib/http/api-response'
import type { ContentLocale } from '@/lib/content-locale'
import { ROUTE_PATHS } from '@/routes/route-paths'

type ProductEditFormValues = {
  name: string
  productUrl: string
  localizedBlocks: LocalizedProductBlocks
  status: ProductStatus
}

type EditProductFormProps = {
  id: string
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function getInitialValues(product: ProductDetail): ProductEditFormValues {
  return {
    name: product.name,
    productUrl: product.productUrl ?? '',
    localizedBlocks: createLocalizedProductBlocks(product),
    status: product.status,
  }
}

function getDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) return 'Không tìm thấy sản phẩm.'
    return error.response?.data?.message || 'Không thể tải thông tin sản phẩm.'
  }

  return 'Không thể tải thông tin sản phẩm.'
}

function getUpdateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể cập nhật sản phẩm. Vui lòng thử lại.'
  }

  return 'Không thể cập nhật sản phẩm. Vui lòng thử lại.'
}

function getBlockLabel(block: Pick<ProductEditorBlock, 'type'>): string {
  if (block.type === 'Title') return 'TITLE'
  if (block.type === 'Description') return 'DESCRIPTION'
  if (block.type === 'Category') return 'CATEGORY'
  return 'FEATURE'
}

function ProductEditSkeleton() {
  return (
    <section className="product-edit product-edit--loading" aria-label="Đang tải thông tin sản phẩm">
      <Skeleton className="product-edit__skeleton-breadcrumb" />
      <Skeleton className="product-edit__skeleton-title" />
      <Skeleton className="product-edit__skeleton-card" />
      <Skeleton className="product-edit__skeleton-form" />
    </section>
  )
}

function EditProductContent({ product, onReload }: { product: ProductDetail; onReload: () => void }) {
  const navigate = useNavigate()
  const updateProduct = useUpdateProduct(product.id)
  const initialValues = getInitialValues(product)
  const unpublishConfirmation = useOverlayState()
  const [contentLocale, setContentLocale] = useState<ContentLocale>('vi')
  const [errorLocales, setErrorLocales] = useState<ContentLocale[]>([])
  const [isPublished, setIsPublished] = useState(product.isPublished)
  const [media, setMedia] = useState<ProductMediaDraft>(() =>
    createProductMediaDraft(product.logoUrl, product.wordmarkUrl),
  )
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ProductEditFormValues>({ defaultValues: initialValues })

  const name = useWatch({ control, name: 'name' })
  const status = useWatch({ control, name: 'status' })
  const blocks = useWatch({ control, name: `localizedBlocks.${contentLocale}` }) ?? []
  const isLocked = isPublished
  const mediaDirty = isProductMediaDirty(media)
  const profileDirty = isDirty || mediaDirty
  const publishToggleHint = isPublished
    ? null
    : profileDirty
      ? 'Lưu thay đổi trước khi đăng.'
      : status !== 'Completed'
        ? 'Chỉ sản phẩm đã hoàn thành mới có thể đăng.'
        : !hasFinalProductMedia(media.logo) || !hasFinalProductMedia(media.wordmark)
          ? 'Cần có đầy đủ Logo và Wordmark để đăng.'
          : null
  const [hasConflict, setHasConflict] = useState(false)
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)

  function reorderBlocks(sourceId: string, targetId: string) {
    const current = getValues('localizedBlocks')
    const next = {
      vi: reorderProductContentBlocks(current.vi, sourceId, targetId),
      en: reorderProductContentBlocks(current.en, sourceId, targetId),
    }
    if (next.vi === current.vi && next.en === current.en) return

    setValue('localizedBlocks', next, { shouldDirty: true, shouldTouch: true })
  }

  function handleBlockDragStart(event: DragEvent<HTMLDivElement>, blockId: string) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', blockId)
    setDraggingBlockId(blockId)
  }

  function handleBlockDragOver(event: DragEvent<HTMLDivElement>, blockId: string) {
    if (!draggingBlockId || draggingBlockId === blockId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverBlockId(blockId)
  }

  function handleBlockDrop(event: DragEvent<HTMLDivElement>, blockId: string) {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain') || draggingBlockId
    if (sourceId) reorderBlocks(sourceId, blockId)
    setDraggingBlockId(null)
    setDragOverBlockId(null)
  }

  function handleBlockKeyDown(event: KeyboardEvent<HTMLDivElement>, blockId: string) {
    const currentIndex = (blocks ?? []).findIndex((block) => block.id === blockId)
    if (currentIndex < 0) return

    const nextIndex = event.key === 'ArrowUp' ? currentIndex - 1 : event.key === 'ArrowDown' ? currentIndex + 1 : -1
    if (nextIndex < 0 || nextIndex >= (blocks ?? []).length) return

    event.preventDefault()
    reorderBlocks(blockId, blocks![nextIndex].id)
  }

  function updateFeatureItems(blockIndex: number, update: (items: LocalizedProductBlocks[ContentLocale][number]['items']) => LocalizedProductBlocks[ContentLocale][number]['items']) {
    const current = getValues('localizedBlocks')
    const next = {
      vi: current.vi.map((block, index) => index === blockIndex ? { ...block, items: update(block.items) } : block),
      en: current.en.map((block, index) => index === blockIndex ? { ...block, items: update(block.items) } : block),
    }
    setValue('localizedBlocks', next, { shouldDirty: true, shouldTouch: true })
  }

  function applySavedProduct(nextProduct: ProductDetail) {
    reset(getInitialValues(nextProduct))
    setMedia(createProductMediaDraft(nextProduct.logoUrl, nextProduct.wordmarkUrl))
    setIsPublished(nextProduct.isPublished)
    setHasConflict(false)
    setErrorLocales([])
    clearErrors()
  }

  async function save(values: ProductEditFormValues) {
    if (isLocked) {
      return
    }

    const trimmedName = values.name.trim()
    setErrorLocales([])

    if (!trimmedName) {
      setError('name', { type: 'manual', message: 'Tên sản phẩm là bắt buộc.' })
      return
    }

    if (trimmedName.length > 200) {
      setError('name', { type: 'manual', message: 'Tên sản phẩm không được vượt quá 200 ký tự.' })
      return
    }

    const mediaPayload = buildProductMediaMutation(media)
    const bilingualContent = buildBilingualProductContent(values.localizedBlocks)

    const payload: UpdateProductFormRequest = {
      name: trimmedName,
      productUrl: toNullableString(values.productUrl),
      ...bilingualContent,
      status: values.status,
      expectedUpdatedAt: product.updatedAt,
      ...mediaPayload,
    }

    try {
      const nextProduct = await updateProduct.mutateAsync(payload)
      applySavedProduct(nextProduct)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        if (error.response?.status === 409) setHasConflict(true)
        const code = error.response?.data?.errors?.code
        const fields = error.response?.data?.errors?.fields ?? []
        if (code === 'BILINGUAL_CONTENT_REQUIRED' || code === 'BILINGUAL_SCHEMA_INVALID') {
          setErrorLocales(getProductContentErrorLocales(fields))
        }
        if (fields.includes('name')) {
          setError('name', {
            type: 'server',
            message: error.response?.data?.message || 'Tên sản phẩm không hợp lệ.',
          })
          return
        }

        if (
          code === 'PRODUCT_IMAGES_INVALID' ||
          code === 'PRODUCT_IMAGE_ACTION_INVALID' ||
          code === 'PRODUCT_IMAGES_REQUIRED' ||
          code?.startsWith('MEDIA_')
        ) {
          setError('root', {
            type: 'server',
            message: error.response?.data?.message || 'Media sản phẩm không hợp lệ.',
          })
          return
        }
      }

      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  async function publish() {
    clearErrors('root')
    setHasConflict(false)
    setErrorLocales([])

    if (profileDirty) {
      setError('root', {
        type: 'manual',
        message: 'Thông tin chỉnh sửa chưa được lưu. Vui lòng lưu trước khi đăng.',
      })
      return
    }

    if (status !== 'Completed') {
      setError('root', {
        type: 'manual',
        message: 'Chỉ sản phẩm đã hoàn thành mới có thể đăng.',
      })
      return
    }

    if (!hasFinalProductMedia(media.logo) || !hasFinalProductMedia(media.wordmark)) {
      setError('root', {
        type: 'manual',
        message: 'Để đăng sản phẩm, cần có đầy đủ Logo và Wordmark.',
      })
      return
    }

    const values = getValues()
    const bilingualContent = buildBilingualProductContent(values.localizedBlocks)
    const payload: UpdateProductFormRequest = {
      name: values.name.trim(),
      productUrl: toNullableString(values.productUrl),
      ...bilingualContent,
      status: values.status,
      isPublished: true,
      expectedUpdatedAt: product.updatedAt,
      ...buildProductMediaMutation(media),
    }

    try {
      const nextProduct = await updateProduct.mutateAsync(payload)
      applySavedProduct(nextProduct)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        if (error.response?.status === 409) setHasConflict(true)
        const code = error.response?.data?.errors?.code
        const fields = error.response?.data?.errors?.fields ?? []
        if (code === 'BILINGUAL_CONTENT_REQUIRED' || code === 'BILINGUAL_SCHEMA_INVALID') {
          setErrorLocales(getProductContentErrorLocales(fields))
        }
      }
      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  async function confirmUnpublish() {
    try {
      const nextProduct = await updateProduct.mutateAsync({ isPublished: false, expectedUpdatedAt: product.updatedAt })
      applySavedProduct(nextProduct)
      unpublishConfirmation.close()
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error) && error.response?.status === 409) {
        setHasConflict(true)
      }
      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    }
  }

  return (
    <section className="product-edit">
      <nav className="product-edit__breadcrumb" aria-label="Breadcrumb">
        <Link
          to={ROUTE_PATHS.PRODUCTS}
          state={{ productNavigation: 'back-to-list' }}
        >
          Sản phẩm
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <Link to={ROUTE_PATHS.PRODUCT_DETAIL.replace(':id', product.id)}>Chi tiết sản phẩm</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chỉnh sửa sản phẩm</span>
      </nav>

      <div className="product-detail__toolbar product-create__toolbar product-edit__toolbar" aria-label="Thao tác chỉnh sửa sản phẩm">
        <Button
          className="product-create__cancel"
          type="button"
          variant="secondary"
          isDisabled={updateProduct.isPending}
          onClick={() => navigate(ROUTE_PATHS.PRODUCT_DETAIL.replace(':id', product.id))}
        >
          Hủy
        </Button>
        <Button
          className="product-create__submit product-edit__submit"
          type="submit"
          form="product-edit-form"
          variant="primary"
          isDisabled={updateProduct.isPending || isLocked || (!isDirty && !mediaDirty)}
        >
          {updateProduct.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      <BilingualContentCard
        className="product-edit__sheet product-edit__bilingual-sheet"
        value={contentLocale}
        onChange={setContentLocale}
        errorLocales={errorLocales}
      >
        <section className="product-edit__summary-card product-create__summary-card">
          <ProductLogoPreview src={product.logoUrl} alt={`Logo ${name || product.name}`} compact />
          <label className="product-edit__field product-create__field product-create__header-name-field">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <input
                  {...field}
                  form="product-edit-form"
                  aria-label="Tên sản phẩm"
                  maxLength={200}
                  disabled={isLocked}
                />
              )}
            />
            {errors.name && <small role="alert">{errors.name.message}</small>}
          </label>
          <div className="product-detail__status-stack product-edit__status-stack" aria-label="Trạng thái sản phẩm">
            <Chip
              className={`product-detail__status product-detail__status--${status === 'Completed' ? 'completed' : 'in-progress'}`}
              color="default"
              size="sm"
              variant="secondary"
            >
              {status === 'Completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}
            </Chip>
            <div className="product-edit__publish-control">
              <button
                className={`product-edit__publish-toggle ${isPublished ? 'is-on' : 'is-off'}`}
                type="button"
                aria-label="Hiển thị sản phẩm trên website"
                aria-pressed={isPublished}
                disabled={updateProduct.isPending || Boolean(publishToggleHint)}
                onClick={() => {
                  if (isPublished) {
                    unpublishConfirmation.open()
                    return
                  }

                  void publish()
                }}
              >
                <span>{isPublished ? 'Đã đăng' : 'Chưa đăng'}</span>
                <span className="product-edit__publish-toggle-track" aria-hidden="true">
                  <span className="product-edit__publish-toggle-thumb" />
                </span>
              </button>
              {publishToggleHint && <small>{publishToggleHint}</small>}
            </div>
          </div>
        </section>

        {isLocked ? (
          <div className="product-edit__locked-note">
            Product đang được đăng. Hãy gỡ đăng trước; request này chỉ thay đổi trạng thái hiển thị và không sửa nội dung/media.
          </div>
        ) : null}

        <form id="product-edit-form" className="product-edit__form" onSubmit={handleSubmit(save)} noValidate>
          <div className="product-create__layout product-edit__layout">
            <div className="product-create__assets-column">
              <ProductMediaManager
                value={media}
                onChange={setMedia}
                disabled={isLocked || updateProduct.isPending}
                variant="create-inline"
              />

              <label className="product-edit__field product-create__field product-create__product-url-field">
                <span>Product URL</span>
                <Controller
                  control={control}
                  name="productUrl"
                  render={({ field }) => (
                    <input {...field} form="product-edit-form" type="url" placeholder="https://..." disabled={isLocked} />
                  )}
                />
              </label>
            </div>

            <div className="product-create__content-column">
              <section className="product-edit__content-section product-create__content-section product-content-card">
                <div className="product-create__content-heading product-create__field-heading">
                  <h2>Content</h2>
                  <span>Kéo tiêu đề để sắp xếp</span>
                </div>

                <div className="product-edit__blocks product-create__blocks product-content-card__blocks">
                  {blocks.length > 0 ? (
                    blocks.map((block, blockIndex) => (
                      <div
                        className={`product-edit__block product-create__block product-content-block ${block.type === 'Feature' ? 'product-content-block--feature' : ''}`}
                        key={block.id}
                      >
                        <div
                          className={`product-content-block__title ${draggingBlockId === block.id ? 'product-content-block__title--dragging' : ''} ${dragOverBlockId === block.id ? 'product-content-block__title--drag-over' : ''}`}
                          role="button"
                          tabIndex={isLocked ? -1 : 0}
                          aria-label={`Sắp xếp ${getBlockLabel(block)}`}
                          draggable={!isLocked && !updateProduct.isPending}
                          onDragStart={(event) => handleBlockDragStart(event, block.id)}
                          onDragOver={(event) => handleBlockDragOver(event, block.id)}
                          onDrop={(event) => handleBlockDrop(event, block.id)}
                          onDragEnd={() => {
                            setDraggingBlockId(null)
                            setDragOverBlockId(null)
                          }}
                          onKeyDown={(event) => handleBlockKeyDown(event, block.id)}
                        >
                          <strong>{getBlockLabel(block)}</strong>
                          <span>Khối {blockIndex + 1}</span>
                        </div>
                        {block.type === 'Feature' ? (
                          <div className="product-content-block__body product-content-block__body--feature">
                            <div className="product-create__feature-field">
                              <div className="product-create__feature-heading">
                                <Button
                                  className="product-create__add-feature"
                                  type="button"
                                  variant="outline"
                                  isDisabled={isLocked || updateProduct.isPending}
                                  onClick={() => {
                                    const featureId = crypto.randomUUID()
                                    updateFeatureItems(blockIndex, (items) => [
                                      ...items,
                                      { id: featureId, title: '' },
                                    ])
                                  }}
                                >
                                  <Plus size={14} aria-hidden="true" />
                                  Thêm feature
                                </Button>
                              </div>
                              <div className="product-edit__feature-items product-create__feature-items">
                                {(block.items ?? []).length > 0 ? (
                                  (block.items ?? []).map((item, itemIndex) => (
                                    <div className="product-create__feature-row" key={item.id}>
                                      <Controller
                                        control={control}
                                        name={`localizedBlocks.${contentLocale}.${blockIndex}.items.${itemIndex}.title` as const}
                                        render={({ field }) => (
                                          <input
                                            {...field}
                                            disabled={isLocked}
                                            aria-label={`Feature ${itemIndex + 1}`}
                                            placeholder={`Feature ${itemIndex + 1}`}
                                          />
                                        )}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        isIconOnly
                                        aria-label={`Xóa feature ${itemIndex + 1}`}
                                        isDisabled={isLocked || updateProduct.isPending}
                                        onClick={() => {
                                          const currentItems = blocks[blockIndex].items ?? []
                                          if (currentItems.length > 1) {
                                            const nextItems = currentItems.filter((_, currentIndex) => currentIndex !== itemIndex)
                                            updateFeatureItems(blockIndex, () => nextItems)
                                            return
                                          }

                                          updateFeatureItems(blockIndex, (items) => items.map((item) => ({ ...item, title: '' })))
                                        }}
                                      >
                                        <Trash2 size={15} aria-hidden="true" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="product-edit__block-empty">Chưa có tính năng.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="product-content-block__body">
                            <Controller
                              control={control}
                              name={`localizedBlocks.${contentLocale}.${blockIndex}.text` as const}
                              render={({ field }) => (
                                <div
                                  className={`product-rich-editor ${block.type === 'Description' ? 'product-rich-editor--description' : 'product-rich-editor--compact'}`}
                                >
                                  <RichTextEditor
                                    value={field.value}
                                    onChange={field.onChange}
                                    variant={block.type === 'Description' ? 'content' : 'summary'}
                                    placeholder={
                                      block.type === 'Title'
                                        ? 'Tiêu đề nội dung'
                                        : block.type === 'Category'
                                          ? 'Danh mục'
                                          : 'Mô tả sản phẩm'
                                    }
                                    ariaLabel={getBlockLabel(block)}
                                    disabled={isLocked || updateProduct.isPending}
                                  />
                                </div>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="product-edit__content-empty">Sản phẩm chưa có Content.</div>
                  )}
                </div>
              </section>

              <div className="product-edit__state-grid product-edit__state-grid--single product-edit__state-grid--content">
                <fieldset className="product-edit__state-fieldset">
                  <legend>TRẠNG THÁI</legend>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <div className="product-edit__segmented">
                        <Button
                          type="button"
                          variant={field.value === 'InProgress' ? 'primary' : 'outline'}
                          className={field.value === 'InProgress' ? 'is-selected is-progress' : ''}
                          isDisabled={isLocked}
                          onClick={() => field.onChange('InProgress')}
                        >
                          Đang thực hiện
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === 'Completed' ? 'secondary' : 'outline'}
                          className={field.value === 'Completed' ? 'is-selected is-completed' : ''}
                          isDisabled={isLocked}
                          onClick={() => field.onChange('Completed')}
                        >
                          Đã hoàn thành
                        </Button>
                      </div>
                    )}
                  />
                </fieldset>
              </div>
            </div>
          </div>

          {errors.root && (
            <p className="product-edit__form-error" role="alert">
              {errors.root.message}
            </p>
          )}
          {hasConflict && (
            <Button type="button" variant="outline" onClick={onReload} isDisabled={updateProduct.isPending}>
              Tải lại dữ liệu
            </Button>
          )}
        </form>
      </BilingualContentCard>

      <Modal.Root state={unpublishConfirmation}>
        <Modal.Backdrop className="product-edit__unpublish-backdrop" isDismissable={!updateProduct.isPending}>
          <Modal.Container className="product-edit__unpublish-container" placement="center" size="md">
            <Modal.Dialog className="product-edit__unpublish-dialog">
              <Modal.Header className="product-edit__unpublish-header">
                <Modal.Heading className="product-edit__unpublish-heading">Gỡ đăng sản phẩm?</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="product-edit__unpublish-body">
                <p>Sản phẩm sẽ chuyển về trạng thái chưa đăng. Nội dung và media hiện tại vẫn được giữ nguyên.</p>
              </Modal.Body>
              <Modal.Footer className="product-edit__unpublish-footer">
                <Button type="button" variant="outline" isDisabled={updateProduct.isPending} onClick={unpublishConfirmation.close}>
                  Hủy
                </Button>
                <Button type="button" variant="primary" isDisabled={updateProduct.isPending} onClick={() => void confirmUnpublish()}>
                  {updateProduct.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </section>
  )
}

export function EditProductForm({ id }: EditProductFormProps) {
  const productQuery = useProductDetail(id)

  if (productQuery.isPending) {
    return <ProductEditSkeleton />
  }

  if (!productQuery.data || productQuery.error) {
    return (
      <section className="product-edit__error">
        <h1>Không thể mở sản phẩm</h1>
        <p>{getDetailErrorMessage(productQuery.error)}</p>
        <Button type="button" variant="primary" onClick={() => void productQuery.refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  return (
    <EditProductContent
      key={`${productQuery.data.id}:${productQuery.data.updatedAt ?? ''}:${productQuery.data.isPublished}`}
      product={productQuery.data}
      onReload={() => void productQuery.refetch()}
    />
  )
}
