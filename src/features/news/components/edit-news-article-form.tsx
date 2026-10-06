import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Chip, FieldError, Form, Input, Label, Skeleton, TextField } from '@heroui/react'
import axios from 'axios'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { NewsImagePicker } from '@/features/news/components/news-image-picker'
import { RichTextContent } from '@/features/news/components/rich-text-content'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import { useNewsArticleDetail } from '@/features/news/hooks/use-news-article-detail'
import { useNewsCategories } from '@/features/news/hooks/use-news-categories'
import { useUpdateNewsArticle } from '@/features/news/hooks/use-update-news-article'
import {
  editNewsArticleFormSchema,
  publishEditedNewsArticleSchema,
  type EditNewsArticleFormValues,
} from '@/features/news/schemas/edit-news-article.schema'
import { newsService } from '@/features/news/services/news.service'
import type {
  NewsArticleDetail,
  NewsCategoryOption,
  NewsUpdateStatus,
  UpdateNewsArticleRequest,
} from '@/features/news/types'
import { getNewsMutationErrorMessage } from '@/features/news/utils/news-media'
import { getNewsCategoryLabel, getNewsStatusLabel } from '@/features/news/utils/news-labels'
import { getNewsMutationErrorDetails } from '@/features/news/utils/news-mutation-error'
import { countRichTextCharacters } from '@/features/news/utils/rich-text'
import type { ContentLocale } from '@/lib/content-locale'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const formFieldNames = new Set(['title', 'summary', 'content', 'categoryIds', 'translations.en.title', 'translations.en.summary', 'translations.en.content'])

function getEditValues(article: NewsArticleDetail): EditNewsArticleFormValues {
  return {
    title: article.title ?? '', summary: article.summary ?? '', content: article.content ?? '',
    categoryIds: article.categories.map((category) => category.id),
    translations: { en: {
      title: article.translations?.en?.title ?? '',
      summary: article.translations?.en?.summary ?? '',
      content: article.translations?.en?.content ?? '',
    } },
  }
}

function getInvalidLocales(errors: FieldErrors<EditNewsArticleFormValues>): ContentLocale[] {
  const locales: ContentLocale[] = []
  if (errors.title || errors.summary || errors.content) locales.push('vi')
  if (errors.translations?.en) locales.push('en')
  return locales
}

type NewsStatusKind = NewsUpdateStatus | 'Unknown'

function getStatusKind(status: string): NewsStatusKind {
  const normalized = status.trim().toLocaleLowerCase('vi-VN')

  if (normalized === 'draft' || normalized === 'bản nháp') return 'Draft'
  if (normalized === 'published' || normalized === 'đã đăng') return 'Published'
  if (normalized === 'closed' || normalized === 'đã đóng') return 'Closed'
  return 'Unknown'
}

function getStatusClassName(status: NewsStatusKind): string {
  if (status === 'Draft') return 'draft'
  if (status === 'Published') return 'published'
  if (status === 'Closed') return 'closed'
  return 'unknown'
}

function getLoadErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) return 'Không tìm thấy bài viết.'
    return error.response?.data?.message || 'Không thể tải thông tin bài viết.'
  }

  return 'Không thể tải thông tin bài viết.'
}

function getUpdateErrorMessage(error: unknown): string {
  return getNewsMutationErrorMessage(error, 'Không thể cập nhật bài viết. Vui lòng thử lại.')
}

function mergeCategories(
  currentCategories: NewsCategoryOption[],
  availableCategories: NewsCategoryOption[] | undefined,
): NewsCategoryOption[] {
  const categoryMap = new Map<string, NewsCategoryOption>()

  for (const category of currentCategories) categoryMap.set(category.id, category)
  for (const category of availableCategories ?? []) categoryMap.set(category.id, category)

  return Array.from(categoryMap.values())
}

function NewsEditSkeleton() {
  return (
    <section className="news-create news-edit news-edit--loading" aria-label="Đang tải bài viết">
      <Skeleton className="news-edit__skeleton-breadcrumb" />
      <Skeleton className="news-edit__skeleton-title" />
      <div className="news-create__layout">
        <Skeleton className="news-edit__skeleton-content" />
        <Skeleton className="news-edit__skeleton-settings" />
      </div>
    </section>
  )
}

type LoadedEditFormProps = {
  article: NewsArticleDetail
}

function LoadedEditForm({ article: initialArticle }: LoadedEditFormProps) {
  const [article, setArticle] = useState(initialArticle)
  const statusKind = getStatusKind(article.status)
  const canEdit = article.actions.includes('Edit') && (statusKind === 'Draft' || statusKind === 'Published')
  const navigate = useNavigate()
  const categoriesQuery = useNewsCategories()
  const updateNewsArticle = useUpdateNewsArticle(article.id)
  const [submittingStatus, setSubmittingStatus] = useState<NewsUpdateStatus | null>(null)
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [serverErrorLocales, setServerErrorLocales] = useState<ContentLocale[]>([])
  const [hasConflict, setHasConflict] = useState(false)
  const [latestArticle, setLatestArticle] = useState<NewsArticleDetail | null>(null)
  const [isLoadingLatest, setIsLoadingLatest] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EditNewsArticleFormValues>({
    resolver: zodResolver(editNewsArticleFormSchema),
    defaultValues: getEditValues(article),
    shouldUnregister: false,
  })

  const viContent = useWatch({ control, name: 'content' }) ?? ''
  const enContent = useWatch({ control, name: 'translations.en.content' }) ?? ''
  const content = locale === 'vi' ? viContent : enContent
  const titleField = locale === 'vi' ? 'title' : 'translations.en.title'
  const summaryField = locale === 'vi' ? 'summary' : 'translations.en.summary'
  const contentField = locale === 'vi' ? 'content' : 'translations.en.content'
  const contentErrors = locale === 'vi' ? errors : errors.translations?.en
  const errorLocales = [...new Set([...getInvalidLocales(errors), ...serverErrorLocales])]
  const selectedCategoryIds = useWatch({ control, name: 'categoryIds' }) ?? []
  const nonWhitespaceContentLength = countRichTextCharacters(content)
  const isSaving = isSubmitting || updateNewsArticle.isPending
  const cannotSave = isSaving || hasConflict || !canEdit
  const isPublished = statusKind === 'Published'
  const categories = useMemo(
    () => mergeCategories(article.categories, categoriesQuery.data),
    [article.categories, categoriesQuery.data],
  )
  const selectedCategoryNames = categories
    .filter((category) => selectedCategoryIds.includes(category.id))
    .map((category) => getNewsCategoryLabel(category.name))
  const selectedCategoryLabel = selectedCategoryNames.length > 1
    ? `${selectedCategoryNames[0]} +${selectedCategoryNames.length - 1}`
    : selectedCategoryNames[0]

  function applyPublishValidation(values: EditNewsArticleFormValues): boolean {
    const validation = publishEditedNewsArticleSchema.safeParse(values)

    if (validation.success) return true

    for (const issue of validation.error.issues) {
      const field = issue.path.join('.') as FieldPath<EditNewsArticleFormValues>
      if (field) setError(field, { type: 'manual', message: issue.message })
    }

    const firstContentIssue = validation.error.issues.find((issue) => issue.path[0] !== 'categoryIds')
    if (firstContentIssue) setLocale(firstContentIssue.path[0] === 'translations' ? 'en' : 'vi')
    return false
  }

  function applyServerErrors(error: unknown) {
    if (!axios.isAxiosError<ApiResponse<unknown>>(error) || error.response?.status !== 400) return

    const { errorLocales: invalidLocales } = getNewsMutationErrorDetails(error)
    setServerErrorLocales(invalidLocales)
    if (invalidLocales[0]) setLocale(invalidLocales[0])

    for (const rawField of error.response?.data?.errors?.fields ?? []) {
      const field = rawField.replace(/^\$\./, '').replace(/^categoryIds\[\d+\]$/, 'categoryIds')
      if (!formFieldNames.has(field)) continue

      setError(field as FieldPath<EditNewsArticleFormValues>, {
        type: 'server',
        message: error.response?.data?.message || 'Dữ liệu chưa hợp lệ.',
      })
    }
  }

  function clearContentError(field: FieldPath<EditNewsArticleFormValues>) {
    clearErrors(field)
    setServerErrorLocales((current) => current.filter((item) => item !== locale))
  }

  async function loadLatestArticle() {
    if (isLoadingLatest) return
    setIsLoadingLatest(true)
    setReloadError(null)
    try {
      setLatestArticle(await newsService.getNewsArticleDetail(article.id))
    } catch {
      setReloadError('Không thể tải bản mới. Nội dung đang soạn vẫn được giữ nguyên.')
    } finally {
      setIsLoadingLatest(false)
    }
  }

  function reconcileLatestArticle(keepDraft: boolean) {
    if (!latestArticle || isLoadingLatest) return
    setArticle(latestArticle)
    if (!keepDraft) {
      reset(getEditValues(latestArticle))
      setImageFile(null)
      setRemoveImage(false)
      setImageError(null)
    }
    clearErrors()
    setServerErrorLocales([])
    setHasConflict(false)
    setLatestArticle(null)
    setReloadError(null)
  }

  function toggleCategory(categoryId: string) {
    const nextCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId]

    setValue('categoryIds', nextCategoryIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    clearErrors('categoryIds')
  }

  async function submit(values: EditNewsArticleFormValues, targetStatus: 'Draft' | 'Published') {
    if (cannotSave) return

    clearErrors()
    setServerErrorLocales([])

    if (targetStatus === 'Published' && !applyPublishValidation(values)) return

    const payload: UpdateNewsArticleRequest = {
      title: values.title.trim() || null,
      summary: values.summary.trim() || null,
      content: values.content.trim() || null,
      translations: { en: {
        title: values.translations.en.title.trim() || null,
        summary: values.translations.en.summary.trim() || null,
        content: values.translations.en.content.trim() || null,
      } },
      expectedUpdatedAt: article.updatedAtUtc,
      categoryIds: values.categoryIds,
      status: targetStatus,
      image: imageFile,
      action: removeImage && !imageFile ? 'removeImage' : undefined,
    }

    try {
      setSubmittingStatus(targetStatus)
      await updateNewsArticle.mutateAsync(payload)
      navigate(ROUTE_PATHS.NEWS_DETAIL.replace(':id', article.id))
    } catch (error: unknown) {
      const { isConflict } = getNewsMutationErrorDetails(error)
      setHasConflict(isConflict)
      applyServerErrors(error)
      setError('root', {
        type: 'server',
        message: isConflict
          ? 'Bài viết đã thay đổi trên máy chủ. Nội dung đang soạn được giữ nguyên; hãy tải bản mới để đối chiếu trước khi lưu tiếp.'
          : getUpdateErrorMessage(error),
      })
    } finally {
      setSubmittingStatus(null)
    }
  }

  const onInvalid = (validationErrors: FieldErrors<EditNewsArticleFormValues>) => {
    const invalidLocale = getInvalidLocales(validationErrors)[0]
    if (invalidLocale) setLocale(invalidLocale)
  }
  const saveDraft = handleSubmit((values) => submit(values, 'Draft'), onInvalid)
  const savePublished = handleSubmit((values) => submit(values, 'Published'), onInvalid)

  if (!canEdit) {
    return (
      <section className="news-edit__blocked">
        <h1>Không thể chỉnh sửa bài viết</h1>
        <p>{statusKind === 'Closed' ? 'Bài viết đã đóng và không thể chỉnh sửa hoặc đăng lại.' : 'Bài viết hiện không ở trạng thái cho phép chỉnh sửa.'}</p>
        <Link className="news-detail__back-link" to={ROUTE_PATHS.NEWS_DETAIL.replace(':id', article.id)}>Quay lại chi tiết</Link>
      </section>
    )
  }

  return (
    <section className="news-create news-edit">
      <nav className="news-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.NEWS} state={{ newsNavigation: 'back-to-list' }}>Tin tức</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <Link to={ROUTE_PATHS.NEWS_DETAIL.replace(':id', article.id)}>Chi tiết bài viết</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chỉnh sửa bài viết</span>
      </nav>

      <Form
        className="news-create__form"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          void savePublished()
        }}
      >
        <div className="news-detail__toolbar news-edit__toolbar" aria-label="Thao tác chỉnh sửa bài viết">
            <Button
              className="news-create__draft"
              type="button"
              variant="secondary"
              isDisabled={isSaving}
              onClick={() => navigate(ROUTE_PATHS.NEWS_DETAIL.replace(':id', article.id))}
            >
              Hủy
            </Button>
            {statusKind === 'Draft' && (
              <Button
                className="news-create__draft"
                type="button"
                variant="secondary"
              isDisabled={cannotSave}
              onClick={() => void saveDraft()}
              >
                {submittingStatus === 'Draft' ? 'Đang lưu...' : 'Lưu bản nháp'}
              </Button>
            )}
            <Button
              className="news-create__publish"
              type="submit"
              variant="primary"
              isDisabled={cannotSave}
            >
              {submittingStatus === 'Published'
                ? statusKind === 'Draft'
                  ? 'Đang đăng...'
                  : 'Đang lưu...'
                : statusKind === 'Draft'
                  ? 'Đăng bài viết'
                  : 'Lưu thay đổi'}
            </Button>
        </div>

        <div className="news-create__layout">
          <BilingualContentCard
            className="news-create__card news-edit__content-card"
            value={locale}
            onChange={setLocale}
            errorLocales={errorLocales}
          >
            <TextField key={titleField} className="news-create__field" isInvalid={Boolean(contentErrors?.title)} isDisabled={isSaving}>
              <Label>
                Tiêu đề bài viết {isPublished && <span className="news-create__required">*</span>}
              </Label>
              <Controller
                control={control}
                name={titleField}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Nhập tiêu đề bài viết"
                    onChange={(event) => {
                      field.onChange(event)
                      clearContentError(titleField)
                    }}
                  />
                )}
              />
              {contentErrors?.title && <FieldError>{contentErrors.title.message}</FieldError>}
            </TextField>

            <NewsImagePicker
              file={imageFile}
              currentImageUrl={article.imageUrl}
              error={imageError}
              disabled={isSaving}
              removed={removeImage}
              allowRemove
              onChange={(file) => {
                setImageFile(file)
                if (file) setRemoveImage(false)
              }}
              onError={setImageError}
              onRemove={() => setRemoveImage(true)}
            />

            <TextField key={summaryField} className="news-create__field" isInvalid={Boolean(contentErrors?.summary)}>
              <div className="news-create__label-row">
                <Label>
                  Mô tả ngắn {isPublished && <span className="news-create__required">*</span>}
                </Label>
                {!isPublished && <span>Bắt buộc khi đăng</span>}
              </div>
              <Controller
                control={control}
                name={summaryField}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                      clearContentError(summaryField)
                    }}
                    variant="summary"
                    placeholder="Nhập mô tả ngắn về bài viết"
                    ariaLabel="Mô tả ngắn"
                    disabled={isSaving}
                  />
                )}
              />
              {contentErrors?.summary && <FieldError>{contentErrors.summary.message}</FieldError>}
            </TextField>

            <TextField key={contentField} className="news-create__field" isInvalid={Boolean(contentErrors?.content)}>
              <div className="news-create__label-row">
                <Label>
                  Nội dung {isPublished && <span className="news-create__required">*</span>}
                </Label>
                {!isPublished && <span>Bắt buộc khi đăng</span>}
              </div>
              <Controller
                control={control}
                name={contentField}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                      clearContentError(contentField)
                    }}
                    variant="content"
                    placeholder="Nhập nội dung bài viết"
                    ariaLabel="Nội dung bài viết"
                    disabled={isSaving}
                    allowMedia
                  />
                )}
              />
              <div className="news-create__content-meta">
                <span>Không tính khoảng trắng, tab và xuống dòng</span>
                <strong className={nonWhitespaceContentLength >= 300 ? 'is-valid' : ''}>
                  {nonWhitespaceContentLength} / 300 ký tự để đăng
                </strong>
              </div>
              {contentErrors?.content && <FieldError>{contentErrors.content.message}</FieldError>}
            </TextField>
          </BilingualContentCard>

          <aside className="news-create__card news-create__settings-card">
            <h2>Thiết lập xuất bản</h2>

            <div className="news-edit__status-field">
              <span>Trạng thái</span>
              <Chip
                className={`news-edit__status news-edit__status--${getStatusClassName(statusKind)}`}
                color="default"
                size="sm"
                variant="secondary"
              >
                {getNewsStatusLabel(article.status)}
              </Chip>
            </div>

            <div className="news-create__author">
              <span>Tác giả</span>
              <strong>{article.authorName || '—'}</strong>
            </div>

            <div className="news-create__category-field">
              <div className="news-create__label-row">
                <span className="news-create__field-label">
                  Thể loại {isPublished && <span className="news-create__required">*</span>}
                </span>
                {!isPublished && <span>Bắt buộc khi đăng</span>}
              </div>

              <div className="news-create__category-picker">
                <Button
                  className="news-create__category-trigger"
                  type="button"
                  variant="outline"
                  isDisabled={isSaving || categoriesQuery.isPending || Boolean(categoriesQuery.error)}
                  aria-expanded={isCategoryPickerOpen}
                  onClick={() => setIsCategoryPickerOpen((current) => !current)}
                >
                  <span>
                    {categoriesQuery.isPending
                      ? selectedCategoryNames.length > 0
                        ? selectedCategoryLabel
                        : 'Đang tải thể loại...'
                      : categoriesQuery.error
                        ? selectedCategoryNames.length > 0
                          ? selectedCategoryLabel
                          : 'Không thể tải thể loại'
                        : selectedCategoryNames.length > 0
                          ? selectedCategoryLabel
                          : 'Chọn thể loại'}
                  </span>
                  <ChevronDown aria-hidden="true" size={16} />
                </Button>

                {isCategoryPickerOpen && !categoriesQuery.isPending && !categoriesQuery.error && (
                  <div className="news-create__category-options" role="group" aria-label="Chọn thể loại">
                    {categories.length > 0 ? (
                      categories.map((category) => {
                        const isSelected = selectedCategoryIds.includes(category.id)

                        return (
                          <button
                            className={`news-create__category-option ${isSelected ? 'is-selected' : ''}`}
                            key={category.id}
                            type="button"
                            disabled={isSaving}
                            onClick={() => toggleCategory(category.id)}
                          >
                            <span className="news-create__category-check" aria-hidden="true">
                              {isSelected && <Check size={12} />}
                            </span>
                            <span>{getNewsCategoryLabel(category.name)}</span>
                          </button>
                        )
                      })
                    ) : (
                      <p>Chưa có thể loại.</p>
                    )}
                  </div>
                )}
              </div>

              {errors.categoryIds?.message && (
                <p className="news-create__field-error" role="alert">
                  {errors.categoryIds.message}
                </p>
              )}

              {categoriesQuery.error && (
                <div className="news-create__category-error" role="alert">
                  <span>Không thể tải danh sách thể loại. Các thể loại hiện tại vẫn được giữ nguyên.</span>
                  <Button type="button" variant="ghost" onClick={() => void categoriesQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {errors.root && (
          <p className="news-create__form-error" role="alert">
            {errors.root.message}
          </p>
        )}

        {hasConflict && (
          <section className="news-edit__conflict" aria-label="Đối chiếu phiên bản bài viết">
            <Button type="button" variant="secondary" isDisabled={isLoadingLatest} onClick={() => void loadLatestArticle()}>
              {isLoadingLatest ? 'Đang tải bản mới...' : 'Tải bản mới để đối chiếu'}
            </Button>
            {reloadError && <p role="alert">{reloadError}</p>}
            {latestArticle && (
              <>
                <h2>Bản mới trên máy chủ</h2>
                <p>Trạng thái: {getNewsStatusLabel(latestArticle.status)} · Phiên bản: {latestArticle.updatedAtUtc ?? 'Không có token'}</p>
                <p>Thể loại: {latestArticle.categories.map((category) => getNewsCategoryLabel(category.name)).join(', ') || '—'}</p>
                {latestArticle.imageUrl && <img className="news-edit__latest-image" src={latestArticle.imageUrl} alt="Ảnh đại diện bản mới" />}
                {!latestArticle.imageUrl && <p>Ảnh đại diện: Không có</p>}
                {(['vi', 'en'] as const).map((language) => {
                  const latestContent = language === 'vi' ? latestArticle : latestArticle.translations?.en
                  return (
                    <details key={language} lang={language}>
                      <summary>{language === 'vi' ? 'Nội dung VI trên máy chủ' : 'Nội dung EN trên máy chủ'}</summary>
                      <h3>{latestContent?.title || 'Chưa có tiêu đề'}</h3>
                      <RichTextContent className="news-detail__summary" html={latestContent?.summary ?? null} fallback="Chưa có mô tả ngắn" />
                      <RichTextContent className="news-detail__content" html={latestContent?.content ?? null} fallback="Chưa có nội dung" />
                    </details>
                  )
                })}
                {latestArticle.actions.includes('Edit') && ['Draft', 'Published'].includes(getStatusKind(latestArticle.status)) ? (
                  <>
                    <p>“Dùng bản mới” thay nội dung đang soạn bằng dữ liệu máy chủ. “Giữ nội dung đang soạn” giữ cả VI/EN và thiết lập hiện tại; khi bấm Lưu tiếp, toàn bộ nội dung này sẽ thay thế bản máy chủ vừa đối chiếu. Không tự động lưu.</p>
                    <div className="news-detail__error-actions">
                      <Button type="button" variant="secondary" isDisabled={isLoadingLatest} onClick={() => reconcileLatestArticle(false)}>Dùng bản mới</Button>
                      <Button type="button" variant="primary" isDisabled={isLoadingLatest} onClick={() => reconcileLatestArticle(true)}>Giữ nội dung đang soạn</Button>
                    </div>
                  </>
                ) : (
                  <p role="alert">Bản mới không còn cho phép chỉnh sửa. Nội dung đang soạn vẫn được giữ để đối chiếu.</p>
                )}
              </>
            )}
          </section>
        )}

      </Form>
    </section>
  )
}

type EditNewsArticleFormProps = {
  id: string
}

export function EditNewsArticleForm({ id }: EditNewsArticleFormProps) {
  const detailQuery = useNewsArticleDetail(id)

  if (detailQuery.isPending) return <NewsEditSkeleton />

  if (!detailQuery.data) {
    return (
      <section className="news-edit__blocked">
        <h1>Không thể chỉnh sửa bài viết</h1>
        <p>{getLoadErrorMessage(detailQuery.error)}</p>
        <div className="news-detail__error-actions">
          <Link className="news-detail__back-link" to={ROUTE_PATHS.NEWS} state={{ newsNavigation: 'back-to-list' }}>
            Quay lại danh sách
          </Link>
          <Button type="button" variant="primary" onClick={() => void detailQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      </section>
    )
  }

  return (
    <LoadedEditForm
      key={detailQuery.data.id}
      article={detailQuery.data}
    />
  )
}
