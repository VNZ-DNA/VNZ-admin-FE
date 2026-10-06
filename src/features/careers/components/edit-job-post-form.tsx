import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FieldError, Form, Input, Label, Skeleton, TextField } from '@heroui/react'
import axios from 'axios'
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import { useDepartments } from '@/features/careers/hooks/use-departments'
import { useJobPostDetail } from '@/features/careers/hooks/use-job-post-detail'
import { useUpdateJobPost } from '@/features/careers/hooks/use-update-job-post'
import { getJobPostStatusKind, isJobPostEditableStatus } from '@/features/careers/job-post-status'
import {
  createBilingualJobPostFormSchema,
  publishBilingualJobPostSchema,
  type CreateBilingualJobPostFormValues as CreateJobPostFormValues,
} from '@/features/careers/schemas/create-bilingual-job-post.schema'
import {
  JOB_POST_EMPLOYMENT_TYPES,
  JOB_POST_LEVELS,
  type DepartmentOption,
  type JobPostCreateAction,
  type JobPostDetail,
  type JobPostEmploymentType,
  type JobPostLevel,
} from '@/features/careers/types'
import { buildCreateJobPostPayload } from '@/features/careers/utils/job-post-payload'
import type { ContentLocale } from '@/lib/content-locale'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const employmentTypeLabels: Record<JobPostEmploymentType, string> = {
  Internship: 'Thực tập',
  FullTime: 'Toàn thời gian',
  PartTime: 'Bán thời gian',
  Contract: 'Hợp đồng',
}

const jobLevelLabels: Record<JobPostLevel, string> = {
  Intern: 'Intern',
  Fresher: 'Fresher',
  Junior: 'Junior',
  Middle: 'Middle',
  Senior: 'Senior',
  Lead: 'Lead',
}

const departmentLabels: Record<string, string> = {
  ENGINEERING: 'Kỹ thuật',
  PRODUCT: 'Sản phẩm',
  OPERATIONS: 'Vận hành',
}

const formFieldNames = new Set([
  'title',
  'expiredDate',
  'departmentId',
  'employmentType',
  'jobLevel',
  'numberOfPositions',
  'shortDescription',
  'description',
  'requirements',
  'skills',
  'translations.en.title',
  'translations.en.shortDescription',
  'translations.en.description',
  'translations.en.requirements',
])

function getInvalidLocales(errors: FieldErrors<CreateJobPostFormValues>): ContentLocale[] {
  const locales: ContentLocale[] = []
  if (errors.title || errors.shortDescription || errors.description || errors.requirements) locales.push('vi')
  if (errors.translations?.en) locales.push('en')
  return locales
}

type EditJobPostFormProps = {
  id: string
}

type JobPostSelectOption = {
  value: string
  label: string
}

type JobPostSelectFieldProps = {
  label: string
  required?: boolean
  value: string
  placeholder: string
  options: JobPostSelectOption[]
  error?: string
  disabled?: boolean
  isOpen: boolean
  onToggle: () => void
  onSelect: (value: string) => void
}

function JobPostSelectField({
  label,
  required = false,
  value,
  placeholder,
  options,
  error,
  disabled = false,
  isOpen,
  onToggle,
  onSelect,
}: JobPostSelectFieldProps) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className="job-post-edit__settings-field job-post-edit__settings-field--select">
      <span className="job-post-edit__settings-label">
        {label}
        {required && <span className="job-post-edit__required">*</span>}
      </span>
      <div className="job-post-edit__select">
        <button
          className="job-post-edit__select-trigger"
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <span>{selectedOption?.label ?? placeholder}</span>
          <ChevronDown aria-hidden="true" size={15} />
        </button>
        {isOpen && (
          <div className="job-post-edit__select-menu" role="listbox" aria-label={label}>
            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  className={`job-post-edit__select-option ${isSelected ? 'is-selected' : ''}`}
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(option.value)}
                >
                  <span className="job-post-edit__select-check" aria-hidden="true">
                    {isSelected && <Check size={12} />}
                  </span>
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {error && <p className="job-post-create__field-error">{error}</p>}
    </div>
  )
}

function toEmploymentType(value: string | null): string {
  if (!value) return ''

  const normalized = value.trim().toLocaleLowerCase('vi-VN')
  const match = JOB_POST_EMPLOYMENT_TYPES.find((type) => type.toLocaleLowerCase('vi-VN') === normalized)
  if (match) return match

  const displayMatch = Object.entries(employmentTypeLabels).find(
    ([, label]) => label.toLocaleLowerCase('vi-VN') === normalized,
  )

  return displayMatch?.[0] ?? ''
}

function toJobLevel(value: string | null): string {
  if (!value) return ''
  const normalized = value.trim().toLocaleLowerCase('vi-VN')
  return JOB_POST_LEVELS.find((level) => level.toLocaleLowerCase('vi-VN') === normalized) ?? ''
}

function getDepartmentId(jobPost: JobPostDetail, departments: DepartmentOption[]): string {
  if (jobPost.departmentId) return jobPost.departmentId
  if (!jobPost.department) return ''

  const department = departments.find(
    (item) => item.name.trim().toLocaleLowerCase('vi-VN') === jobPost.department?.trim().toLocaleLowerCase('vi-VN'),
  )

  return department?.id ?? ''
}

function getInitialValues(jobPost: JobPostDetail, departments: DepartmentOption[]): CreateJobPostFormValues {
  return {
    title: jobPost.title ?? '',
    expiredDate: jobPost.expiredDate ?? '',
    departmentId: getDepartmentId(jobPost, departments),
    employmentType: toEmploymentType(jobPost.employmentType),
    jobLevel: toJobLevel(jobPost.jobLevel),
    numberOfPositions: String(jobPost.numberOfPositions ?? 0),
    shortDescription: jobPost.shortDescription ?? '',
    description: jobPost.description ?? '',
    requirements: jobPost.requirements ?? '',
    skills: jobPost.skills?.length ? jobPost.skills.map((value) => ({ value })) : [{ value: '' }],
    translations: {
      en: {
        title: jobPost.translations?.en?.title ?? '',
        shortDescription: jobPost.translations?.en?.shortDescription ?? '',
        description: jobPost.translations?.en?.description ?? '',
        requirements: jobPost.translations?.en?.requirements ?? '',
      },
    },
  }
}

function getUpdateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể cập nhật tin tuyển dụng. Vui lòng thử lại.'
  }

  return 'Không thể cập nhật tin tuyển dụng. Vui lòng thử lại.'
}

function getDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) return 'Không tìm thấy tin tuyển dụng.'
    return error.response?.data?.message || 'Không thể tải thông tin tin tuyển dụng.'
  }

  return 'Không thể tải thông tin tin tuyển dụng.'
}

function normalizeServerField(field: string): string {
  if (!field) return field
  return `${field[0].toLocaleLowerCase('vi-VN')}${field.slice(1)}`
}

function JobPostEditSkeleton() {
  return (
    <section className="job-post-create job-post-edit job-post-edit--loading" aria-label="Đang tải tin tuyển dụng">
      <Skeleton className="job-post-edit__skeleton-breadcrumb" />
      <Skeleton className="job-post-edit__skeleton-title" />
      <div className="job-post-edit__layout">
        <Skeleton className="job-post-edit__skeleton-card" />
        <Skeleton className="job-post-edit__skeleton-settings" />
      </div>
    </section>
  )
}

function EditFormContent({ jobPost, departments }: { jobPost: JobPostDetail; departments: DepartmentOption[] }) {
  const navigate = useNavigate()
  const updateJobPost = useUpdateJobPost(jobPost.id)
  const [submittingAction, setSubmittingAction] = useState<JobPostCreateAction | null>(null)
  const [openSelect, setOpenSelect] = useState<'departmentId' | 'employmentType' | 'jobLevel' | null>(null)
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [serverErrorLocales, setServerErrorLocales] = useState<ContentLocale[]>([])
  const statusKind = getJobPostStatusKind(jobPost.status)
  const isOpen = statusKind === 'Open'

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobPostFormValues>({
    resolver: zodResolver(createBilingualJobPostFormSchema),
    defaultValues: {
      title: '',
      expiredDate: '',
      departmentId: '',
      employmentType: '',
      jobLevel: '',
      numberOfPositions: '',
      shortDescription: '',
      description: '',
      requirements: '',
      skills: [{ value: '' }],
      translations: {
        en: {
          title: '',
          shortDescription: '',
          description: '',
          requirements: '',
        },
      },
    },
  })

  const { fields: skillFields, append, remove } = useFieldArray({
    control,
    name: 'skills',
  })

  useEffect(() => {
    reset(getInitialValues(jobPost, departments))
  }, [departments, jobPost, reset])

  const isSaving = isSubmitting || updateJobPost.isPending

  function applyPublishValidation(values: CreateJobPostFormValues): boolean {
    const validation = publishBilingualJobPostSchema.safeParse(values)
    if (validation.success) return true

    for (const issue of validation.error.issues) {
      const field = issue.path.join('.') as FieldPath<CreateJobPostFormValues>
      if (field) setError(field, { type: 'manual', message: issue.message })
    }

    const firstContentIssue = validation.error.issues.find((issue) => ![
      'departmentId',
      'employmentType',
      'jobLevel',
      'numberOfPositions',
      'expiredDate',
    ].includes(String(issue.path[0])))
    if (firstContentIssue) setLocale(firstContentIssue.path[0] === 'translations' ? 'en' : 'vi')

    return false
  }

  function applyServerErrors(error: unknown) {
    if (!axios.isAxiosError<ApiResponse<unknown>>(error) || error.response?.status !== 400) return

    const fields = (error.response?.data?.errors?.fields ?? []).map((field) => field.replace(/^\$\./, ''))
    const invalidLocales: ContentLocale[] = []
    for (const rawField of fields) {
      const field = rawField.startsWith('translations.en.') ? rawField : normalizeServerField(rawField)
      if (field.startsWith('translations.en.')) invalidLocales.push('en')
      else if (formFieldNames.has(field)) invalidLocales.push('vi')

      if (!formFieldNames.has(field)) continue
      setError(field as FieldPath<CreateJobPostFormValues>, {
        type: 'server',
        message: error.response?.data?.message || 'Dữ liệu chưa hợp lệ.',
      })
    }

    setServerErrorLocales([...new Set(invalidLocales)])
    if (invalidLocales[0]) setLocale(invalidLocales[0])
  }

  function clearContentError(field: FieldPath<CreateJobPostFormValues>) {
    clearErrors(field)
    setServerErrorLocales((current) => current.filter((item) => item !== locale))
  }

  async function submit(values: CreateJobPostFormValues, action: JobPostCreateAction) {
    if (isSaving) return

    clearErrors()

    if (action === 'Publish' && !applyPublishValidation(values)) return

    const payload = buildCreateJobPostPayload(values, action)

    try {
      setSubmittingAction(action)
      await updateJobPost.mutateAsync(payload)
      navigate(`/careers/${jobPost.id}`)
    } catch (error: unknown) {
      applyServerErrors(error)
      setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
    } finally {
      setSubmittingAction(null)
    }
  }

  const onInvalid = (validationErrors: typeof errors) => {
    const invalidLocale = getInvalidLocales(validationErrors)[0]
    if (invalidLocale) setLocale(invalidLocale)
  }

  const saveDraft = handleSubmit((values) => submit(values, 'SavedDraft'), onInvalid)
  const saveOpen = handleSubmit((values) => submit(values, 'Publish'), onInvalid)
  const selectedDepartmentId = useWatch({ control, name: 'departmentId' }) ?? ''
  const selectedEmploymentType = useWatch({ control, name: 'employmentType' }) ?? ''
  const selectedJobLevel = useWatch({ control, name: 'jobLevel' }) ?? ''
  const titleField = (locale === 'vi' ? 'title' : 'translations.en.title') as FieldPath<CreateJobPostFormValues>
  const shortDescriptionField = (locale === 'vi' ? 'shortDescription' : 'translations.en.shortDescription') as FieldPath<CreateJobPostFormValues>
  const descriptionField = (locale === 'vi' ? 'description' : 'translations.en.description') as FieldPath<CreateJobPostFormValues>
  const requirementsField = (locale === 'vi' ? 'requirements' : 'translations.en.requirements') as FieldPath<CreateJobPostFormValues>
  const contentErrors = locale === 'vi' ? errors : errors.translations?.en
  const errorLocales = [...new Set([...getInvalidLocales(errors), ...serverErrorLocales])]

  function selectValue(name: 'departmentId' | 'employmentType' | 'jobLevel', value: string) {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    clearErrors(name)
    setOpenSelect(null)
  }

  return (
    <section className="job-post-create job-post-edit">
      <nav className="job-post-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.CAREERS} state={{ careerNavigation: 'back-to-list' }}>Tuyển dụng</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <Link to={`/careers/${jobPost.id}`}>Chi tiết tuyển dụng</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chỉnh sửa tuyển dụng</span>
      </nav>

      <Form
        className="job-post-create__form"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          void saveOpen()
        }}
      >
        <div className="job-post-edit__toolbar" aria-label="Thao tác chỉnh sửa tin tuyển dụng">
          <Button
            className="job-post-create__draft"
            type="button"
            variant="secondary"
            isDisabled={isSaving}
            onClick={() => navigate(`/careers/${jobPost.id}`)}
          >
            Hủy
          </Button>
          {!isOpen && (
            <Button
              className="job-post-create__draft"
              type="button"
              variant="secondary"
              isDisabled={isSaving}
              onClick={() => void saveDraft()}
            >
              {submittingAction === 'SavedDraft' ? 'Đang lưu...' : 'Lưu bản nháp'}
            </Button>
          )}
          <Button className="job-post-create__publish" type="submit" variant="primary" isDisabled={isSaving}>
            {submittingAction === 'Publish'
              ? isOpen
                ? 'Đang lưu...'
                : 'Đang đăng...'
              : isOpen
                ? 'Lưu thay đổi'
                : 'Đăng tuyển'}
          </Button>
        </div>

        <div className="job-post-edit__layout">
          <section className="job-post-create__content-column">
            <BilingualContentCard
              className="job-post-create__card job-post-create__content-card job-post-edit__content-card"
              value={locale}
              onChange={setLocale}
              errorLocales={errorLocales}
              sharedSection={(
                <div className="job-post-edit__skills-field">
                  <h2 className="job-post-edit__skills-title">
                    Kĩ năng yêu cầu
                  </h2>
                  <div className="job-post-create__skills">
                    <div className="job-post-create__skills-heading">
                      <Button
                        className="job-post-create__add-skill"
                        type="button"
                        variant="outline"
                        onClick={() => append({ value: '' })}
                      >
                        <Plus size={14} aria-hidden="true" />
                        Thêm kỹ năng
                      </Button>
                    </div>

                    <div className="job-post-create__skill-list">
                      {skillFields.map((field, index) => (
                        <div className="job-post-create__skill-row" key={field.id}>
                          <Input
                            aria-label={`Kỹ năng ${index + 1}`}
                            placeholder="Ví dụ: C#, SQL, Docker..."
                            {...register(`skills.${index}.value`)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            isIconOnly
                            aria-label={`Xóa kỹ năng ${index + 1}`}
                            onClick={() => {
                              if (skillFields.length > 1) {
                                remove(index)
                              } else {
                                setValue('skills.0.value', '', { shouldDirty: true })
                              }
                            }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {errors.skills?.message && (
                      <p className="job-post-create__field-error" role="alert">
                        {errors.skills.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            >
            <TextField key={titleField} className="job-post-create__field" isInvalid={Boolean(contentErrors?.title)}>
              <Label>
                Tiêu đề <span className="job-post-edit__required">*</span>
              </Label>
              <Controller
                control={control}
                name={titleField}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    maxLength={300}
                    placeholder="Nhập tiêu đề"
                    onChange={(event) => {
                      field.onChange(event)
                      clearContentError(titleField)
                    }}
                  />
                )}
              />
              {contentErrors?.title && <FieldError>{contentErrors.title.message}</FieldError>}
            </TextField>

            <TextField key={shortDescriptionField} className="job-post-create__field" isInvalid={Boolean(contentErrors?.shortDescription)}>
              <Label>
                Mô tả ngắn <span className="job-post-edit__required">*</span>
              </Label>
              <Controller
                control={control}
                name={shortDescriptionField}
                render={({ field }) => (
                  <textarea
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                    className="job-post-create__textarea job-post-create__textarea--short"
                    placeholder="Nhập mô tả ngắn"
                    onChange={(event) => {
                      field.onChange(event)
                      clearContentError(shortDescriptionField)
                    }}
                  />
                )}
              />
              {contentErrors?.shortDescription && <FieldError>{contentErrors.shortDescription.message}</FieldError>}
            </TextField>

            <TextField key={descriptionField} className="job-post-create__field" isInvalid={Boolean(contentErrors?.description)}>
              <Label>
                Mô tả công việc <span className="job-post-edit__required">*</span>
              </Label>
              <Controller
                control={control}
                name={descriptionField}
                render={({ field }) => (
                  <RichTextEditor
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(value) => {
                      field.onChange(value)
                      clearContentError(descriptionField)
                    }}
                    variant="content"
                    placeholder="Nhập chi tiết mô tả công việc của vị trí tuyển dụng..."
                    ariaLabel="Mô tả công việc"
                    disabled={isSaving}
                    allowMedia={false}
                    httpsOnly
                  />
                )}
              />
              {contentErrors?.description && <FieldError>{contentErrors.description.message}</FieldError>}
            </TextField>

            <TextField key={requirementsField} className="job-post-create__field" isInvalid={Boolean(contentErrors?.requirements)}>
              <Label>
                Yêu cầu ứng viên <span className="job-post-edit__required">*</span>
              </Label>
              <Controller
                control={control}
                name={requirementsField}
                render={({ field }) => (
                  <RichTextEditor
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(value) => {
                      field.onChange(value)
                      clearContentError(requirementsField)
                    }}
                    variant="content"
                    placeholder="Nhập yêu cầu về bằng cấp, kinh nghiệm và kỹ năng chuyên môn..."
                    ariaLabel="Yêu cầu ứng viên"
                    disabled={isSaving}
                    allowMedia={false}
                    httpsOnly
                  />
                )}
              />
              {contentErrors?.requirements && <FieldError>{contentErrors.requirements.message}</FieldError>}
            </TextField>

            </BilingualContentCard>
          </section>

          <aside className="job-post-create__card job-post-edit__settings-card">
            <h2>Thông tin tuyển dụng</h2>

            <div className="job-post-edit__status-field">
              <span className="job-post-edit__settings-label">Trạng thái</span>
              <span className={`job-post-edit__status job-post-edit__status--${statusKind.toLocaleLowerCase('vi-VN')}`}>
                {jobPost.status}
              </span>
            </div>

            <JobPostSelectField
              label="Phòng ban"
              required={isOpen}
              value={selectedDepartmentId}
              placeholder="Chọn phòng ban"
              options={departments.map((department) => ({
                value: department.id,
                label: departmentLabels[department.name] ?? department.name,
              }))}
              error={errors.departmentId?.message}
              isOpen={openSelect === 'departmentId'}
              onToggle={() => setOpenSelect(openSelect === 'departmentId' ? null : 'departmentId')}
              onSelect={(value) => selectValue('departmentId', value)}
            />

            <JobPostSelectField
              label="Loại hình"
              required={isOpen}
              value={selectedEmploymentType}
              placeholder="Chọn loại hình"
              options={JOB_POST_EMPLOYMENT_TYPES.map((type) => ({ value: type, label: employmentTypeLabels[type] }))}
              error={errors.employmentType?.message}
              isOpen={openSelect === 'employmentType'}
              onToggle={() => setOpenSelect(openSelect === 'employmentType' ? null : 'employmentType')}
              onSelect={(value) => selectValue('employmentType', value)}
            />

            <JobPostSelectField
              label="Cấp bậc"
              required={isOpen}
              value={selectedJobLevel}
              placeholder="Chọn cấp bậc"
              options={JOB_POST_LEVELS.map((level) => ({ value: level, label: jobLevelLabels[level] }))}
              error={errors.jobLevel?.message}
              isOpen={openSelect === 'jobLevel'}
              onToggle={() => setOpenSelect(openSelect === 'jobLevel' ? null : 'jobLevel')}
              onSelect={(value) => selectValue('jobLevel', value)}
            />

            <TextField
              className="job-post-edit__settings-field job-post-edit__settings-field--input"
              isInvalid={Boolean(errors.numberOfPositions)}
            >
              <Label className="job-post-edit__settings-label">
                Chỉ tiêu {isOpen && <span className="job-post-edit__required">*</span>}
              </Label>
              <Controller
                control={control}
                name="numberOfPositions"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={isOpen ? 1 : 0}
                    step={1}
                    inputMode="numeric"
                    placeholder="Nhập số lượng"
                    onChange={(event) => {
                      field.onChange(event)
                      clearErrors('numberOfPositions')
                    }}
                  />
                )}
              />
              {errors.numberOfPositions && <FieldError>{errors.numberOfPositions.message}</FieldError>}
            </TextField>

            <TextField className="job-post-edit__settings-field" isInvalid={Boolean(errors.expiredDate)}>
              <Label className="job-post-edit__settings-label">
                Ngày hết hạn {isOpen && <span className="job-post-edit__required">*</span>}
              </Label>
              <Controller
                control={control}
                name="expiredDate"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    onChange={(event) => {
                      field.onChange(event)
                      clearErrors('expiredDate')
                    }}
                  />
                )}
              />
              {errors.expiredDate && <FieldError>{errors.expiredDate.message}</FieldError>}
            </TextField>
          </aside>
        </div>

        {errors.root && (
          <p className="job-post-create__form-error" role="alert">
            {errors.root.message}
          </p>
        )}
      </Form>
    </section>
  )
}

export function EditJobPostForm({ id }: EditJobPostFormProps) {
  const detailQuery = useJobPostDetail(id)
  const departmentsQuery = useDepartments()

  if (detailQuery.isPending || departmentsQuery.isPending) return <JobPostEditSkeleton />

  if (!detailQuery.data || detailQuery.error) {
    return (
      <section className="job-post-detail__error">
        <h1>Không thể chỉnh sửa tin tuyển dụng</h1>
        <p>{getDetailErrorMessage(detailQuery.error)}</p>
        <div className="job-post-detail__error-actions">
          <Link
            className="job-post-detail__back-link"
            to={ROUTE_PATHS.CAREERS}
            state={{ careerNavigation: 'back-to-list' }}
          >
            Quay lại danh sách
          </Link>
          <Button type="button" variant="primary" onClick={() => void detailQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      </section>
    )
  }

  const statusKind = getJobPostStatusKind(detailQuery.data.status)
  const isEditableStatus = isJobPostEditableStatus(detailQuery.data.status)

  if (!detailQuery.data.canEdit || !isEditableStatus) {
    return (
      <section className="job-post-edit__blocked">
        <h1>Không thể chỉnh sửa tin tuyển dụng</h1>
        <p>
          {statusKind === 'Expired'
            ? 'Tin tuyển dụng đã hết hạn và không thể chỉnh sửa.'
            : statusKind === 'Closed'
              ? 'Tin tuyển dụng đã đóng và không thể chỉnh sửa.'
              : 'Tin tuyển dụng hiện không ở trạng thái cho phép chỉnh sửa.'}
        </p>
        <Link className="job-post-detail__back-link" to={`/careers/${id}`}>
          Quay lại chi tiết
        </Link>
      </section>
    )
  }

  if (!departmentsQuery.data || departmentsQuery.error) {
    return (
      <section className="job-post-detail__error">
        <h1>Không thể chỉnh sửa tin tuyển dụng</h1>
        <p>Không thể tải danh sách phòng ban.</p>
        <div className="job-post-detail__error-actions">
          <Link className="job-post-detail__back-link" to={`/careers/${id}`}>
            Quay lại chi tiết
          </Link>
          <Button type="button" variant="primary" onClick={() => void departmentsQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      </section>
    )
  }

  return (
    <EditFormContent
      key={`${detailQuery.data.id}-${detailQuery.data.updatedAt ?? 'current'}`}
      jobPost={detailQuery.data}
      departments={departmentsQuery.data}
    />
  )
}
