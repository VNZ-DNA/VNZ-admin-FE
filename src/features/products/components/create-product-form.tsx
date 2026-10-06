import { Button } from '@heroui/react'
import axios from 'axios'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState, type DragEvent, type KeyboardEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import { ProductLogoPreview } from '@/features/products/components/product-logo-preview'
import { ProductMediaManager } from '@/features/products/components/product-media-manager'
import { useCreateProduct } from '@/features/products/hooks/use-create-product'
import {
  buildProductMediaMutation,
  createProductMediaDraft,
  type ProductMediaDraft,
} from '@/features/products/product-media'
import { reorderProductContentBlocks } from '@/features/products/product-content-blocks'
import {
  buildBilingualProductContent,
  createLocalizedProductBlocks,
  getProductContentErrorLocales,
  type LocalizedProductBlocks,
} from '@/features/products/utils/product-content-form'
import type { CreateProductRequest, ProductContentBlockType } from '@/features/products/types'
import type { ApiResponse } from '@/lib/http/api-response'
import type { ContentLocale } from '@/lib/content-locale'
import { ROUTE_PATHS } from '@/routes/route-paths'

type ProductCreateFormValues = {
  name: string
  productUrl: string
  localizedBlocks: LocalizedProductBlocks
}

function createDefaultValues(): ProductCreateFormValues {
  return {
    name: '',
    productUrl: '',
    localizedBlocks: createLocalizedProductBlocks(),
  }
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function getBlockLabel(type: ProductContentBlockType): string {
  if (type === 'Title') return 'TITLE'
  if (type === 'Description') return 'DESCRIPTION'
  if (type === 'Category') return 'CATEGORY'
  return 'FEATURE'
}

function getCreateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tạo sản phẩm. Vui lòng thử lại.'
  }

  return 'Không thể tạo sản phẩm. Vui lòng thử lại.'
}

export function CreateProductForm() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const [media, setMedia] = useState<ProductMediaDraft>(() => createProductMediaDraft())
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm<ProductCreateFormValues>({ defaultValues: createDefaultValues() })
  const name = useWatch({ control, name: 'name' })
  const [contentLocale, setContentLocale] = useState<ContentLocale>('vi')
  const [errorLocales, setErrorLocales] = useState<ContentLocale[]>([])
  const blocks = useWatch({ control, name: `localizedBlocks.${contentLocale}` }) ?? []
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
    const currentIndex = blocks.findIndex((block) => block.id === blockId)
    if (currentIndex < 0) return

    const nextIndex = event.key === 'ArrowUp' ? currentIndex - 1 : event.key === 'ArrowDown' ? currentIndex + 1 : -1
    if (nextIndex < 0 || nextIndex >= blocks.length) return

    event.preventDefault()
    reorderBlocks(blockId, blocks[nextIndex].id)
  }

  function updateFeatureItems(blockIndex: number, update: (items: LocalizedProductBlocks[ContentLocale][number]['items']) => LocalizedProductBlocks[ContentLocale][number]['items']) {
    const current = getValues('localizedBlocks')
    const next = {
      vi: current.vi.map((block, index) => index === blockIndex ? { ...block, items: update(block.items) } : block),
      en: current.en.map((block, index) => index === blockIndex ? { ...block, items: update(block.items) } : block),
    }
    setValue('localizedBlocks', next, { shouldDirty: true, shouldTouch: true })
  }

  async function create(values: ProductCreateFormValues) {
    const trimmedName = values.name.trim()
    clearErrors('root')
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

    const payload: CreateProductRequest = {
      name: trimmedName,
      productUrl: toNullableString(values.productUrl),
      ...buildBilingualProductContent(values.localizedBlocks),
      ...(mediaPayload.logo ? { logo: mediaPayload.logo } : {}),
      ...(mediaPayload.wordmark ? { wordmark: mediaPayload.wordmark } : {}),
    }

    try {
      await createProduct.mutateAsync(payload)
      navigate(ROUTE_PATHS.PRODUCTS)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        const code = error.response?.data?.errors?.code
        const fields = error.response?.data?.errors?.fields ?? []

        if (code === 'BILINGUAL_CONTENT_REQUIRED' || code === 'BILINGUAL_SCHEMA_INVALID') {
          setErrorLocales(getProductContentErrorLocales(fields))
          setError('root', {
            type: 'server',
            message: error.response?.data?.message || 'Nội dung song ngữ không hợp lệ.',
          })
          return
        }

        if (code === 'PRODUCT_VALIDATION_FAILED' || fields.includes('name')) {
          setError('name', {
            type: 'server',
            message: error.response?.data?.message || 'Tên sản phẩm không hợp lệ.',
          })
          return
        }

        if (code === 'PRODUCT_CONTENT_INVALID') {
          setError('root', {
            type: 'server',
            message: error.response?.data?.message || 'Nội dung sản phẩm không hợp lệ.',
          })
          return
        }

        if (code === 'PRODUCT_IMAGES_INVALID' || code === 'PRODUCT_IMAGE_ACTION_INVALID' || code?.startsWith('MEDIA_')) {
          setError('root', {
            type: 'server',
            message: error.response?.data?.message || 'Nhóm ảnh sản phẩm không hợp lệ.',
          })
          return
        }
      }

      setError('root', { type: 'server', message: getCreateErrorMessage(error) })
    }
  }

  return (
    <section className="product-edit product-create">
      <nav className="product-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.PRODUCTS}>Sản phẩm</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Tạo sản phẩm mới</span>
      </nav>

      <form className="product-edit__form product-create__form" onSubmit={handleSubmit(create)} noValidate>
        <div className="product-detail__toolbar product-create__toolbar" aria-label="Thao tác tạo sản phẩm">
          <Button
            className="product-create__cancel"
            type="button"
            variant="secondary"
            isDisabled={createProduct.isPending}
            onClick={() => navigate(ROUTE_PATHS.PRODUCTS)}
          >
            Hủy
          </Button>
          <Button
            className="product-create__submit"
            type="submit"
            variant="primary"
            isDisabled={createProduct.isPending}
          >
            {createProduct.isPending ? 'Đang tạo...' : 'Tạo sản phẩm'}
          </Button>
        </div>

        <BilingualContentCard
          className="product-edit__sheet product-create__sheet product-create__bilingual-sheet"
          value={contentLocale}
          onChange={setContentLocale}
          errorLocales={errorLocales}
        >
          <section className="product-edit__summary-card product-create__summary-card">
            <ProductLogoPreview src={undefined} alt={`Logo ${name?.trim() || 'sản phẩm mới'}`} compact />
            <label className="product-edit__field product-create__field product-create__header-name-field">
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <input
                    {...field}
                    aria-label="Tên sản phẩm"
                    maxLength={200}
                    placeholder="Nhập tên sản phẩm"
                    autoFocus
                  />
                )}
              />
              {errors.name && <small role="alert">{errors.name.message}</small>}
            </label>
          </section>

          <div className="product-create__layout">
            <div className="product-create__assets-column">
              <ProductMediaManager
                value={media}
                onChange={setMedia}
                disabled={createProduct.isPending}
                variant="create-inline"
              />

              <label className="product-edit__field product-create__field product-create__product-url-field">
                <span>Product URL</span>
                <Controller
                  control={control}
                  name="productUrl"
                  render={({ field }) => <input {...field} type="url" placeholder="https://..." />}
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
                  {blocks.map((block, blockIndex) => (
                    <div
                      className={`product-edit__block product-create__block product-content-block ${block.type === 'Feature' ? 'product-content-block--feature' : ''}`}
                      key={block.id}
                    >
                      <div
                        className={`product-content-block__title ${draggingBlockId === block.id ? 'product-content-block__title--dragging' : ''} ${dragOverBlockId === block.id ? 'product-content-block__title--drag-over' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Sắp xếp ${getBlockLabel(block.type)}`}
                        draggable={!createProduct.isPending}
                        onDragStart={(event) => handleBlockDragStart(event, block.id)}
                        onDragOver={(event) => handleBlockDragOver(event, block.id)}
                        onDrop={(event) => handleBlockDrop(event, block.id)}
                        onDragEnd={() => {
                          setDraggingBlockId(null)
                          setDragOverBlockId(null)
                        }}
                        onKeyDown={(event) => handleBlockKeyDown(event, block.id)}
                      >
                        <strong>{getBlockLabel(block.type)}</strong>
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
                              {(block.items ?? []).map((feature, featureIndex) => (
                                <div className="product-create__feature-row" key={feature.id}>
                                  <Controller
                                    control={control}
                                     name={`localizedBlocks.${contentLocale}.${blockIndex}.items.${featureIndex}.title` as const}
                                    render={({ field }) => (
                                      <input
                                        {...field}
                                        aria-label={`Feature ${featureIndex + 1}`}
                                        placeholder={`Feature ${featureIndex + 1}`}
                                      />
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    isIconOnly
                                    aria-label={`Xóa feature ${featureIndex + 1}`}
                                    onClick={() => {
                                      const currentItems = blocks[blockIndex].items ?? []
                                      if (currentItems.length > 1) {
                                        const nextItems = currentItems.filter((_, currentIndex) => currentIndex !== featureIndex)
                                        updateFeatureItems(blockIndex, () => nextItems)
                                        return
                                      }

                                       updateFeatureItems(blockIndex, (items) => items.map((item) => ({ ...item, title: '' })))
                                    }}
                                  >
                                    <Trash2 size={15} aria-hidden="true" />
                                  </Button>
                                </div>
                              ))}
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
                                  ariaLabel={getBlockLabel(block.type)}
                                  disabled={createProduct.isPending}
                                />
                              </div>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {errors.root && (
            <p className="product-edit__form-error product-create__form-error" role="alert">
              {errors.root.message}
            </p>
          )}

        </BilingualContentCard>
      </form>
    </section>
  )
}
