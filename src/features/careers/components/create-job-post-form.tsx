import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react'
import axios from 'axios'
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { useCreateJobPost } from '@/features/careers/hooks/use-create-job-post'
import { useDepartments } from '@/features/careers/hooks/use-departments'
import { RichTextEditor } from '@/features/news/components/rich-text-editor'
import {
  createBilingualJobPostFormSchema,
  publishBilingualJobPostSchema,
  type CreateBilingualJobPostFormValues as CreateJobPostFormValues,
} from '@/features/careers/schemas/create-bilingual-job-post.schema'
import {
  JOB_POST_EMPLOYMENT_TYPES,
  JOB_POST_LEVELS,
  type JobPostCreateAction,
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

const departmentLabels: Record<string, string> = {
  ENGINEERING: 'Kỹ thuật',
  PRODUCT: 'Sản phẩm',
  OPERATIONS: 'Vận hành',
}

const jobLevelLabels: Record<JobPostLevel, string> = {
  Intern: 'Intern',
  Fresher: 'Fresher',
  Junior: 'Junior',
  Middle: 'Middle',
  Senior: 'Senior',
  Lead: 'Lead',
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

type JobPostSelectOption = {
  value: string
  label: string
}

type JobPostSelectFieldProps = {
  label: string
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
      <span className="job-post-edit__settings-label">{label}</span>
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

function getCreateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tạo tin tuyển dụng. Vui lòng thử lại.'
  }

  return 'Không thể tạo tin tuyển dụng. Vui lòng thử lại.'
}

export function CreateJobPostForm() {
  const navigate = useNavigate()
  const createJobPost = useCreateJobPost()
  const departmentsQuery = useDepartments()
  const [submittingAction, setSubmittingAction] = useState<JobPostCreateAction | null>(null)
  const [openSelect, setOpenSelect] = useState<'departmentId' | 'employmentType' | 'jobLevel' | null>(null)
  const [locale, setLocale] = useState<ContentLocale>('vi')
  const [serverErrorLocales, setServerErrorLocales] = useState<ContentLocale[]>([])

  const {
    register,
    control,
    handleSubmit,
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

  const isSaving = isSubmitting || createJobPost.isPending
  const selectedDepartmentId = useWatch({ control, name: 'departmentId' }) ?? ''
  const selectedEmploymentType = useWatch({ control, name: 'employmentType' }) ?? ''
  const selectedJobLevel = useWatch({ control, name: 'jobLevel' }) ?? ''
  const titleField = (locale === 'vi' ? 'title' : 'translations.en.title') as FieldPath<CreateJobPostFormValues>
  const shortDescriptionField = (locale === 'vi' ? 'shortDescription' : 'translations.en.shortDescription') as FieldPath<CreateJobPostFormValues>
  const descriptionField = (locale === 'vi' ? 'description' : 'translations.en.description') as FieldPath<CreateJobPostFormValues>
  const requirementsField = (locale === 'vi' ? 'requirements' : 'translations.en.requirements') as FieldPath<CreateJobPostFormValues>
  const contentErrors = locale === 'vi' ? errors : errors.translations?.en
  const errorLocales = [...new Set([...getInvalidLocales(errors), ...serverErrorLocales])]

  function applyPublishValidation(values: CreateJobPostFormValues): boolean {
    const validation = publishBilingualJobPostSchema.safeParse(values)
    if (validation.success) return true

    for (const issue of validation.error.issues) {
      const field = issue.path.join('.') as FieldPath<CreateJobPostFormValues>
      if (field) {
        setError(field, { type: 'manual', message: issue.message })
      }
    }

    const firstContentIssue = validation.error.issues.find((issue) => issue.path[0] !== 'departmentId'
      && issue.path[0] !== 'employmentType'
      && issue.path[0] !== 'jobLevel'
      && issue.path[0] !== 'numberOfPositions'
      && issue.path[0] !== 'expiredDate')
    if (firstContentIssue) setLocale(firstContentIssue.path[0] === 'translations' ? 'en' : 'vi')

    return false
  }

  function applyServerErrors(error: unknown) {
    if (!axios.isAxiosError<ApiResponse<unknown>>(error) || error.response?.status !== 400) return

    const fields = (error.response?.data?.errors?.fields ?? []).map((field) => field.replace(/^\$\./, ''))
    const invalidLocales: ContentLocale[] = []
    for (const field of fields) {
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

    clearErrors('root')

    if (action === 'Publish' && !applyPublishValidation(values)) {
      return
    }

    const payload = buildCreateJobPostPayload(values, action)

    try {
      setSubmittingAction(action)
      const createdJobPost = await createJobPost.mutateAsync(payload)
      navigate(ROUTE_PATHS.CAREER_DETAIL.replace(':id', createdJobPost.id))
    } catch (error: unknown) {
      applyServerErrors(error)
      setError('root', {
        type: 'server',
        message: getCreateErrorMessage(error),
      })
    } finally {
      setSubmittingAction(null)
    }
  }

  const onInvalid = (validationErrors: typeof errors) => {
    const invalidLocale = getInvalidLocales(validationErrors)[0]
    if (invalidLocale) setLocale(invalidLocale)
  }

  const saveDraft = handleSubmit((values) => submit(values, 'SavedDraft'), onInvalid)
  const publish = handleSubmit((values) => submit(values, 'Publish'), onInvalid)

  function selectValue(name: 'departmentId' | 'employmentType' | 'jobLevel', value: string) {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    clearErrors(name)
    setOpenSelect(null)
  }

  return (
    <section className="job-post-create job-post-create--new">
      <nav className="job-post-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.CAREERS} state={{ careerNavigation: 'back-to-list' }}>
          Tuyển dụng
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Tạo tin tuyển dụng</span>
      </nav>

      <Form
        className="job-post-create__form"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          void publish()
        }}
      >
        <div className="job-post-edit__toolbar" aria-label="Thao tác tạo tin tuyển dụng">
          <Button
            className="job-post-create__draft"
            type="button"
            variant="secondary"
            isDisabled={isSaving}
            onClick={() => navigate(ROUTE_PATHS.CAREERS, { state: { careerNavigation: 'back-to-list' } })}
          >
            Hủy
          </Button>
          <Button
            className="job-post-create__draft"
            type="button"
            variant="secondary"
            isDisabled={isSaving}
            onClick={() => void saveDraft()}
          >
            {submittingAction === 'SavedDraft' ? 'Đang lưu...' : 'Lưu bản nháp'}
          </Button>
          <Button className="job-post-create__publish" type="submit" variant="primary" isDisabled={isSaving}>
            {submittingAction === 'Publish' ? 'Đang đăng...' : 'Đăng tuyển'}
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
              <div className="job-post-create__label-row">
                <Label>Mô tả ngắn</Label>
                <span>Bắt buộc khi đăng</span>
              </div>
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
              <div className="job-post-create__label-row">
                <Label>Mô tả công việc</Label>
                <span>Bắt buộc khi đăng</span>
              </div>
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
              <div className="job-post-create__label-row">
                <Label>Yêu cầu ứng viên</Label>
                <span>Bắt buộc khi đăng</span>
              </div>
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
            <p className="job-post-create__settings-note">Các trường bên dưới bắt buộc khi đăng tuyển.</p>

            <JobPostSelectField
              label="Phòng ban"
              value={selectedDepartmentId}
              placeholder={departmentsQuery.isPending ? 'Đang tải...' : 'Chọn phòng ban'}
              options={departmentsQuery.data?.map((department) => ({
                value: department.id,
                label: departmentLabels[department.name] ?? department.name,
              })) ?? []}
              error={errors.departmentId?.message}
              disabled={departmentsQuery.isPending || Boolean(departmentsQuery.error)}
              isOpen={openSelect === 'departmentId'}
              onToggle={() => setOpenSelect(openSelect === 'departmentId' ? null : 'departmentId')}
              onSelect={(value) => selectValue('departmentId', value)}
            />

            {departmentsQuery.error && (
              <div className="job-post-create__department-error" role="alert">
                <span>Không thể tải danh sách phòng ban.</span>
                <Button type="button" variant="ghost" onClick={() => void departmentsQuery.refetch()}>
                  Thử lại
                </Button>
              </div>
            )}

            <JobPostSelectField
              label="Loại hình"
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
              value={selectedJobLevel}
              placeholder="Chọn cấp bậc"
              options={JOB_POST_LEVELS.map((level) => ({ value: level, label: jobLevelLabels[level] }))}
              error={errors.jobLevel?.message}
              isOpen={openSelect === 'jobLevel'}
              onToggle={() => setOpenSelect(openSelect === 'jobLevel' ? null : 'jobLevel')}
              onSelect={(value) => selectValue('jobLevel', value)}
            />

            <TextField className="job-post-edit__settings-field job-post-edit__settings-field--input" isInvalid={Boolean(errors.numberOfPositions)}>
              <Label className="job-post-edit__settings-label">Chỉ tiêu</Label>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Nhập số lượng"
                {...register('numberOfPositions')}
              />
              {errors.numberOfPositions && <FieldError>{errors.numberOfPositions.message}</FieldError>}
            </TextField>

            <TextField className="job-post-edit__settings-field" isInvalid={Boolean(errors.expiredDate)}>
              <Label className="job-post-edit__settings-label">Ngày hết hạn</Label>
              <Input type="date" {...register('expiredDate')} />
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
