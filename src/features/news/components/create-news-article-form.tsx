import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react'
import axios from 'axios'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { useAuth } from '@/features/auth/use-auth'
import { NewsImagePicker } from '@/features/news/components/news-image-picker'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import { useCreateNewsArticle } from '@/features/news/hooks/use-create-news-article'
import { useNewsCategories } from '@/features/news/hooks/use-news-categories'
import {
  createNewsArticleFormSchema,
  publishNewsArticleSchema,
  type CreateNewsArticleFormValues,
} from '@/features/news/schemas/create-news-article.schema'
import type { CreateNewsArticleRequest, NewsCreateStatus } from '@/features/news/types'
import { countRichTextCharacters, nullableRichText } from '@/features/news/utils/rich-text'
import { getNewsMutationErrorMessage } from '@/features/news/utils/news-media'
import { getNewsCategoryLabel } from '@/features/news/utils/news-labels'
import { getNewsMutationErrorDetails } from '@/features/news/utils/news-mutation-error'
import type { ContentLocale } from '@/lib/content-locale'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const formFieldNames = new Set([
  'title', 'summary', 'content', 'categoryIds',
  'translations.en.title', 'translations.en.summary', 'translations.en.content',
])

function getInvalidLocales(errors: FieldErrors<CreateNewsArticleFormValues>): ContentLocale[] {
  const locales: ContentLocale[] = []
  if (errors.title || errors.summary || errors.content) locales.push('vi')
  if (errors.translations?.en) locales.push('en')
  return locales
}

function getCreateErrorMessage(error: unknown): string {
  return getNewsMutationErrorMessage(error, 'Không thể tạo bài viết. Vui lòng thử lại.')
}

export function CreateNewsArticleForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const categoriesQuery = useNewsCategories()
  const createNewsArticle = useCreateNewsArticle()
  const [submittingStatus, setSubmittingStatus] = useState<NewsCreateStatus | null>(null)
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [serverErrorLocales, setServerErrorLocales] = useState<ContentLocale[]>([])

  const {
    control,
    getValues,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateNewsArticleFormValues>({
    resolver: zodResolver(createNewsArticleFormSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      categoryIds: [],
      translations: {
        en: {
          title: '',
          summary: '',
          content: '',
        },
      },
    },
  })

  const viContent = useWatch({ control, name: 'content' }) ?? ''
  const enContent = useWatch({ control, name: 'translations.en.content' }) ?? ''
  const content = locale === 'vi' ? viContent : enContent
  const titleField = (locale === 'vi' ? 'title' : 'translations.en.title') as FieldPath<CreateNewsArticleFormValues>
  const summaryField = (locale === 'vi' ? 'summary' : 'translations.en.summary') as FieldPath<CreateNewsArticleFormValues>
  const contentField = (locale === 'vi' ? 'content' : 'translations.en.content') as FieldPath<CreateNewsArticleFormValues>
  const contentErrors = locale === 'vi' ? errors : errors.translations?.en
  const errorLocales = [...new Set([...getInvalidLocales(errors), ...serverErrorLocales])]
  const selectedCategoryIds = useWatch({ control, name: 'categoryIds' }) ?? []
  const nonWhitespaceContentLength = countRichTextCharacters(content)
  const isSaving = isSubmitting || createNewsArticle.isPending
  const selectedCategoryNames = (categoriesQuery.data ?? [])
    .filter((category) => selectedCategoryIds.includes(category.id))
    .map((category) => getNewsCategoryLabel(category.name))

  function applyPublishValidation(values: CreateNewsArticleFormValues): boolean {
    const validation = publishNewsArticleSchema.safeParse(values)

    if (validation.success) return true

    for (const issue of validation.error.issues) {
      const field = issue.path.join('.') as FieldPath<CreateNewsArticleFormValues>
      if (field) {
        setError(field, { type: 'manual', message: issue.message })
      }
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
      setError(field as FieldPath<CreateNewsArticleFormValues>, {
        type: 'server',
        message: error.response?.data?.message || 'Dữ liệu chưa hợp lệ.',
      })
    }
  }

  function clearContentError(field: FieldPath<CreateNewsArticleFormValues>) {
    clearErrors(field)
    setServerErrorLocales((current) => current.filter((item) => item !== locale))
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

  async function submit(values: CreateNewsArticleFormValues, status: NewsCreateStatus) {
    if (isSaving) return

    clearErrors('root')

    if (status === 'Published' && !applyPublishValidation(values)) {
      return
    }

    const payload: CreateNewsArticleRequest = {
      title: values.title.trim() || null,
      summary: nullableRichText(values.summary),
      content: nullableRichText(values.content),
      categoryIds: values.categoryIds,
      status,
      translations: { en: {
        title: values.translations.en.title.trim() || null,
        summary: nullableRichText(values.translations.en.summary),
        content: nullableRichText(values.translations.en.content),
      } },
      image: imageFile,
    }

    try {
      setSubmittingStatus(status)
      const createdArticle = await createNewsArticle.mutateAsync(payload)
      navigate(ROUTE_PATHS.NEWS_DETAIL.replace(':id', createdArticle.id))
    } catch (error: unknown) {
      applyServerErrors(error)
      setError('root', {
        type: 'server',
        message: getCreateErrorMessage(error),
      })
    } finally {
      setSubmittingStatus(null)
    }
  }

  const onInvalid = (validationErrors: typeof errors) => {
    const invalidLocale = getInvalidLocales(validationErrors)[0]
    if (invalidLocale) setLocale(invalidLocale)
  }
  const saveDraft = handleSubmit((values) => submit(values, 'Draft'), onInvalid)
  const publish = handleSubmit((values) => submit(values, 'Published'), onInvalid)
  async function handlePublishClick() {
    if (!applyPublishValidation(getValues())) return
    await publish()
  }

  return (
    <section className="news-create news-create--new">
      <nav className="news-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.NEWS} state={{ newsNavigation: 'back-to-list' }}>Tin tức</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Tạo bài viết mới</span>
      </nav>

      <Form
        className="news-create__form"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          void handlePublishClick()
        }}
      >
        <div className="news-detail__toolbar news-create__toolbar" aria-label="Thao tác tạo bài viết">
          <Button
            className="news-create__draft"
            type="button"
            variant="secondary"
            isDisabled={isSaving}
            onClick={() => navigate(ROUTE_PATHS.NEWS, { state: { newsNavigation: 'back-to-list' } })}
          >
            Hủy
          </Button>
          <Button
            className="news-create__draft"
            type="button"
            variant="secondary"
            isDisabled={isSaving}
            onClick={() => void saveDraft()}
          >
            {submittingStatus === 'Draft' ? 'Đang lưu...' : 'Lưu bản nháp'}
          </Button>
          <Button
            className="news-create__publish"
            type="button"
            variant="primary"
            isDisabled={isSaving || categoriesQuery.isPending || Boolean(categoriesQuery.error)}
            onClick={() => void handlePublishClick()}
          >
            {submittingStatus === 'Published' ? 'Đang đăng...' : 'Đăng bài viết'}
          </Button>
        </div>

        <div className="news-create__layout">
          <BilingualContentCard
            className="news-create__card news-create__content-card"
            value={locale}
            onChange={setLocale}
            errorLocales={errorLocales}
          >
            <TextField key={titleField} className="news-create__field" isInvalid={Boolean(contentErrors?.title)}>
              <Label>
                Tiêu đề bài viết
              </Label>
              <Controller
                control={control}
                name={titleField}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
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
              error={imageError}
              disabled={isSaving}
              allowRemove
              onChange={setImageFile}
              onError={setImageError}
            />

            <TextField key={summaryField} className="news-create__field" isInvalid={Boolean(contentErrors?.summary)}>
              <div className="news-create__label-row">
                <Label>Mô tả ngắn</Label>
                <span>Bắt buộc khi đăng</span>
              </div>
              <Controller
                control={control}
                name={summaryField}
                render={({ field }) => (
                  <RichTextEditor
                    value={typeof field.value === 'string' ? field.value : ''}
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
                <Label>Nội dung</Label>
                <span>Bắt buộc khi đăng</span>
              </div>
              <Controller
                control={control}
                name={contentField}
                render={({ field }) => (
                  <RichTextEditor
                    value={typeof field.value === 'string' ? field.value : ''}
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

            <div className="news-create__author">
              <span>Tác giả</span>
              <strong>{user?.fullName || '—'}</strong>
            </div>

            <div className="news-create__category-field">
              <div className="news-create__label-row">
                <span className="news-create__field-label">Thể loại</span>
                <span>Bắt buộc khi đăng</span>
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
                      ? 'Đang tải thể loại...'
                      : categoriesQuery.error
                        ? 'Không thể tải thể loại'
                        : selectedCategoryNames.length > 0
                          ? selectedCategoryNames.join(', ')
                          : 'Chọn thể loại'}
                  </span>
                  <ChevronDown aria-hidden="true" size={16} />
                </Button>

                {isCategoryPickerOpen && !categoriesQuery.isPending && !categoriesQuery.error && (
                  <div className="news-create__category-options" role="group" aria-label="Chọn thể loại">
                    {(categoriesQuery.data ?? []).length > 0 ? (
                      categoriesQuery.data?.map((category) => {
                        const isSelected = selectedCategoryIds.includes(category.id)

                        return (
                          <button
                            className={`news-create__category-option ${isSelected ? 'is-selected' : ''}`}
                            key={category.id}
                            type="button"
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
                  <span>Không thể tải danh sách thể loại.</span>
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

      </Form>
    </section>
  )
}
