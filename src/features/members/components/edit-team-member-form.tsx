import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Card, FieldError, Form, Input, Label, Modal, TextField, useOverlayState } from '@heroui/react'
import axios from 'axios'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { useTeamMemberDetail } from '@/features/members/hooks/use-team-member-detail'
import { useUpdateTeamMember } from '@/features/members/hooks/use-update-team-member'
import { TeamMemberMediaManager } from '@/features/members/components/team-member-media-manager'
import {
  buildTeamMemberMediaMutation,
  createTeamMemberMediaDraft,
  isTeamMemberMediaDirty,
  type TeamMemberMediaDraft,
} from '@/features/members/member-media'
import {
  updateTeamMemberSchema,
  type UpdateTeamMemberFormValues,
} from '@/features/members/schemas/update-team-member.schema'
import {
  TEAM_MEMBER_JOB_LEVELS,
  type TeamMemberDetail,
  type TeamMemberEmploymentStatus,
  type TeamMemberJobLevel,
  type UpdateTeamMemberProfileRequest,
} from '@/features/members/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

type EditTeamMemberFormProps = {
  id: string
}

type MemberNavigationState = {
  memberNavigation: 'back-to-list'
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toNullableString(value: string): string | null {
  const trimmedValue = value.trim()
  return trimmedValue || null
}

function toEmploymentStatus(value: string): TeamMemberEmploymentStatus {
  if (value === 'Resigned' || value.toLocaleLowerCase('vi').includes('nghỉ')) return 'Resigned'
  return 'Working'
}

function getInitialValues(member: TeamMemberDetail): UpdateTeamMemberFormValues {
  return {
    fullName: member.fullName,
    displayName: member.displayName ?? '',
    email: member.email,
    position: member.position ?? '',
    jobLevel: member.jobLevel ?? '',
    joinedDate: toDateInput(member.joinedDate),
    animationUrl: member.animationUrl ?? '',
    hometown: member.hometown ?? '',
    hobbies: member.hobbies ?? '',
    personalQuote: member.personalQuote ?? '',
    employmentStatus: toEmploymentStatus(member.employmentStatus),
    isPublished: member.isPublished ? 'true' : 'false',
  }
}

function hasProfileChanges(
  values: UpdateTeamMemberFormValues,
  initialValues: UpdateTeamMemberFormValues,
): boolean {
  return (
    values.fullName !== initialValues.fullName ||
    values.displayName !== initialValues.displayName ||
    values.email !== initialValues.email ||
    values.position !== initialValues.position ||
    values.jobLevel !== initialValues.jobLevel ||
    values.joinedDate !== initialValues.joinedDate ||
    values.animationUrl !== initialValues.animationUrl ||
    values.hometown !== initialValues.hometown ||
    values.hobbies !== initialValues.hobbies ||
    values.personalQuote !== initialValues.personalQuote ||
    values.employmentStatus !== initialValues.employmentStatus
  )
}

function getUpdateErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể cập nhật thành viên. Vui lòng thử lại.'
  }
  return 'Không thể cập nhật thành viên. Vui lòng thử lại.'
}

function getDetailErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 404) return 'Không tìm thấy thành viên.'
    return error.response?.data?.message || 'Không thể tải thông tin thành viên.'
  }
  return 'Không thể tải thông tin thành viên.'
}

function MemberEditSkeleton() {
  return (
    <section className="team-member-edit team-member-edit--loading" aria-label="Đang tải thông tin thành viên">
      <div className="team-member-edit__loading-block" />
    </section>
  )
}

function EditFormContent({ member }: { member: TeamMemberDetail }) {
  const navigate = useNavigate()
  const confirmation = useOverlayState()
  const leaveConfirmation = useOverlayState()
  const updateMutation = useUpdateTeamMember(member.id)
  const [savedMember, setSavedMember] = useState(member)
  const [media, setMedia] = useState<TeamMemberMediaDraft>(() => createTeamMemberMediaDraft({
    avatar: member.avatarUrl,
    background: member.backgroundUrl,
    audio: member.audioUrl,
  }))
  const [pendingNavigation, setPendingNavigation] = useState<{
    destination: string
    state?: MemberNavigationState
  } | null>(null)
  const savedValues = getInitialValues(savedMember)
  const {
    handleSubmit,
    control,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<UpdateTeamMemberFormValues>({
    resolver: zodResolver(updateTeamMemberSchema),
    defaultValues: savedValues,
  })

  const employmentStatus = useWatch({ control, name: 'employmentStatus' })
  const isPublishedValue = useWatch({ control, name: 'isPublished' })
  const watchedValues = useWatch({ control }) as UpdateTeamMemberFormValues
  const isFormLocked = savedMember.isPublished
  const profileDirty = hasProfileChanges(watchedValues, savedValues) || isTeamMemberMediaDirty(media)
  const isSaving = updateMutation.isPending

  useEffect(() => {
    if (!profileDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [profileDirty])

  function navigateAway(destination: string, state?: MemberNavigationState) {
    if (profileDirty) {
      setPendingNavigation({ destination, state })
      leaveConfirmation.open()
      return
    }

    navigate(destination, state ? { state } : undefined)
  }

  const closeUnpublishConfirmation = () => {
    if (isSaving) return
    confirmation.close()
  }

  const closeLeaveConfirmation = () => {
    if (isSaving) return
    leaveConfirmation.close()
    setPendingNavigation(null)
  }

  function buildProfilePayload(values: UpdateTeamMemberFormValues): UpdateTeamMemberProfileRequest {
    const payload: UpdateTeamMemberProfileRequest = {
      fullName: values.fullName.trim(),
      displayName: toNullableString(values.displayName),
      email: values.email.trim(),
      position: values.position.trim(),
      jobLevel: values.jobLevel as TeamMemberJobLevel,
      joinedDate: values.joinedDate,
      animationUrl: toNullableString(values.animationUrl),
      hometown: toNullableString(values.hometown),
      hobbies: toNullableString(values.hobbies),
      personalQuote: toNullableString(values.personalQuote),
      employmentStatus: values.employmentStatus as TeamMemberEmploymentStatus,
      ...buildTeamMemberMediaMutation(media),
    }

    return payload
  }

  function applyUpdateError(error: unknown, action: 'profile' | 'publish' | 'unpublish') {
    if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
      const fields = error.response?.data?.errors?.fields ?? []
      const code = error.response?.data?.errors?.code
      const message = error.response?.data?.message || ''

      if (error.response?.status === 409 && fields.includes('email')) {
        setError('email', { type: 'server', message: message || 'Email đã được sử dụng.' })
        return
      }

      if (
        error.response?.status === 400 &&
        code === 'RESOURCE_VALIDATION_FAILED' &&
        action === 'publish' &&
        message.toLocaleLowerCase('vi').includes('displayname')
      ) {
        setError('displayName', {
          type: 'server',
          message: 'Tên hiển thị là bắt buộc khi đăng thành viên.',
        })
        return
      }
    }

    setError('root', { type: 'server', message: getUpdateErrorMessage(error) })
  }

  function applySuccessfulUpdate(updatedMember: TeamMemberDetail) {
    setSavedMember(updatedMember)
    setMedia(createTeamMemberMediaDraft({
      avatar: updatedMember.avatarUrl,
      background: updatedMember.backgroundUrl,
      audio: updatedMember.audioUrl,
    }))
    reset(getInitialValues(updatedMember))
    clearErrors()
  }

  async function saveProfile(values: UpdateTeamMemberFormValues) {
    try {
      const updatedMember = await updateMutation.mutateAsync(buildProfilePayload(values))
      applySuccessfulUpdate(updatedMember)
    } catch (error: unknown) {
      applyUpdateError(error, 'profile')
    }
  }

  async function publishMember() {
    if (profileDirty) {
      setError('root', {
        type: 'validation',
        message: 'Thông tin chỉnh sửa chưa được lưu. Vui lòng lưu trước khi đăng.',
      })
      return
    }

    if (!watchedValues.displayName.trim()) {
      setError('displayName', {
        type: 'validation',
        message: 'Tên hiển thị là bắt buộc khi đăng thành viên.',
      })
      return
    }

    try {
      const updatedMember = await updateMutation.mutateAsync({ isPublished: true })
      applySuccessfulUpdate(updatedMember)
    } catch (error: unknown) {
      applyUpdateError(error, 'publish')
    }
  }

  async function confirmUnpublish() {
    try {
      const updatedMember = await updateMutation.mutateAsync({ isPublished: false })
      confirmation.close()
      applySuccessfulUpdate(updatedMember)
    } catch (error: unknown) {
      closeUnpublishConfirmation()
      applyUpdateError(error, 'unpublish')
    }
  }

  function confirmNavigation() {
    if (!pendingNavigation) return
    const { destination, state } = pendingNavigation
    closeLeaveConfirmation()
    navigate(destination, state ? { state } : undefined)
  }

  return (
    <section className="team-member-edit">
      <nav className="team-member-edit__breadcrumb" aria-label="Breadcrumb">
        <Link
          to={ROUTE_PATHS.MEMBERS}
          state={{ memberNavigation: 'back-to-list' }}
          onClick={(event) => {
            event.preventDefault()
            navigateAway(ROUTE_PATHS.MEMBERS, { memberNavigation: 'back-to-list' })
          }}
        >
          Thành viên
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <Link
          to={`/members/${savedMember.id}`}
          onClick={(event) => {
            event.preventDefault()
            navigateAway(`/members/${savedMember.id}`)
          }}
        >
          Chi tiết thành viên
        </Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Chỉnh sửa thành viên</span>
      </nav>

      <Form
        id="team-member-edit-form"
        className="team-member-edit__form"
        onSubmit={handleSubmit(saveProfile)}
        validationBehavior="aria"
      >
        <div className="team-member-edit__actions" aria-label="Thao tác chỉnh sửa thành viên">
          <Button
            className="team-member-edit__cancel"
            type="button"
            variant="outline"
            onClick={() => navigateAway(`/members/${savedMember.id}`)}
          >
            Hủy
          </Button>
          <Button
            className="team-member-edit__submit"
            type="submit"
            variant="primary"
            isDisabled={!profileDirty || isSaving || isFormLocked}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>

        <div className="team-member-edit__layout">
          <Card className="team-member-edit__card team-member-edit__content-card">
            <div className="team-member-edit__profile">
              <span className="team-member-edit__avatar" aria-hidden="true">
                {savedMember.fullName
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(-2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div>
                <strong>{savedMember.fullName}</strong>
                <span className="team-member-edit__identity-id">/{savedMember.id}</span>
              </div>
            </div>

            {isFormLocked && (
              <div className="team-member-edit__locked-notice">
                Thành viên đang được đăng trên website. Hãy chuyển “Hiển thị website” sang “Chưa đăng” để chỉnh sửa hồ sơ.
              </div>
            )}

            <fieldset className="team-member-edit__editable-fields" disabled={isFormLocked}>
            <div className="team-member-edit__section">
              <h2>Thông tin cơ bản</h2>
              <div className="team-member-edit__basic-columns">
                <div className="team-member-edit__basic-column">
                  <div className="team-member-edit__name-row">
                    <TextField className="team-member-edit__field" isInvalid={Boolean(errors.fullName)}>
                      <Label>Họ và tên <span className="team-member-edit__required" aria-hidden="true">*</span></Label>
                      <Controller
                        control={control}
                        name="fullName"
                        render={({ field }) => <Input {...field} />}
                      />
                      {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
                    </TextField>

                    <TextField className="team-member-edit__field team-member-edit__field--display-name" isInvalid={Boolean(errors.displayName)}>
                      <Label>
                        Tên hiển thị {isPublishedValue === 'true' && <span className="team-member-edit__required" aria-hidden="true">*</span>}
                      </Label>
                      <Controller
                        control={control}
                        name="displayName"
                        render={({ field }) => (
                          <Input
                            {...field}
                            maxLength={100}
                            placeholder="VD: TAN"
                            onChange={(event) => {
                              field.onChange(event)
                              if (event.target.value.trim()) {
                                clearErrors('displayName')
                              }
                            }}
                          />
                        )}
                      />
                      {errors.displayName && <FieldError>{errors.displayName.message}</FieldError>}
                    </TextField>
                  </div>

                  <TextField className="team-member-edit__field" isInvalid={Boolean(errors.email)}>
                    <Label>Email <span className="team-member-edit__required" aria-hidden="true">*</span></Label>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field }) => <Input {...field} type="email" />}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  </TextField>

                  <TextField className="team-member-edit__field">
                    <Label>Quê quán</Label>
                    <Controller
                      control={control}
                      name="hometown"
                      render={({ field }) => <Input {...field} />}
                    />
                  </TextField>

                  <TextField className="team-member-edit__field" isInvalid={Boolean(errors.joinedDate)}>
                    <Label>Ngày tham gia <span className="team-member-edit__required" aria-hidden="true">*</span></Label>
                    <Controller
                      control={control}
                      name="joinedDate"
                      render={({ field }) => <Input {...field} type="date" />}
                    />
                    {errors.joinedDate && <FieldError>{errors.joinedDate.message}</FieldError>}
                  </TextField>
                </div>

                <div className="team-member-edit__basic-column">
                  <TextField className="team-member-edit__field" isInvalid={Boolean(errors.position)}>
                    <Label>Vị trí <span className="team-member-edit__required" aria-hidden="true">*</span></Label>
                    <Controller
                      control={control}
                      name="position"
                      render={({ field }) => <Input {...field} />}
                    />
                    {errors.position && <FieldError>{errors.position.message}</FieldError>}
                  </TextField>

                  <TextField className="team-member-edit__field" isInvalid={Boolean(errors.jobLevel)}>
                    <Label>Cấp bậc <span className="team-member-edit__required" aria-hidden="true">*</span></Label>
                    <Controller
                      control={control}
                      name="jobLevel"
                      render={({ field }) => (
                        <select className="team-member-edit__select" {...field}>
                          {TEAM_MEMBER_JOB_LEVELS.map((jobLevel) => (
                            <option key={jobLevel} value={jobLevel}>{jobLevel}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.jobLevel && <FieldError>{errors.jobLevel.message}</FieldError>}
                  </TextField>

                  <div className="team-member-edit__field team-member-edit__field--employment">
                    <span className="team-member-edit__field-label">Trạng thái làm việc</span>
                    <Controller
                      control={control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <button
                          className={`team-member-edit__toggle ${field.value === 'Working' ? 'is-on' : 'is-off'}`}
                          type="button"
                          aria-pressed={field.value === 'Working'}
                          onClick={() => {
                            const nextValue = field.value === 'Working' ? 'Resigned' : 'Working'
                            field.onChange(nextValue)
                          }}
                        >
                          <span>{field.value === 'Working' ? 'Đang làm việc' : 'Đã nghỉ'}</span>
                          <span className="team-member-edit__toggle-track" aria-hidden="true">
                            <span className="team-member-edit__toggle-thumb" />
                          </span>
                        </button>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="team-member-edit__section">
              <h2>Thông tin hồ sơ</h2>
              <div className="team-member-edit__profile-grid">
                <TeamMemberMediaManager value={media} onChange={setMedia} disabled={isFormLocked || isSaving} />

                <TextField className="team-member-edit__field">
                  <Label>Animation URL</Label>
                  <Controller
                    control={control}
                    name="animationUrl"
                    render={({ field }) => <Input {...field} />}
                  />
                </TextField>

                <TextField className="team-member-edit__field">
                  <Label>Sở thích</Label>
                  <Controller
                    control={control}
                    name="hobbies"
                    render={({ field }) => (
                      <textarea className="team-member-edit__textarea" rows={3} {...field} />
                    )}
                  />
                </TextField>

                <TextField className="team-member-edit__field">
                  <Label>Châm ngôn sống</Label>
                  <Controller
                    control={control}
                    name="personalQuote"
                    render={({ field }) => (
                      <textarea className="team-member-edit__textarea" rows={3} {...field} />
                    )}
                  />
                </TextField>
              </div>
            </div>
            </fieldset>
          </Card>

          <aside className="team-member-edit__status-card">
            <h2>Trạng thái hệ thống</h2>
            <div className="team-member-edit__status-fields">
              <div className="team-member-edit__field team-member-edit__field--publish">
                <span className="team-member-edit__field-label">Hiển thị website</span>
                <Controller
                  control={control}
                  name="isPublished"
                  render={({ field }) => (
                    <button
                      className={`team-member-edit__toggle ${field.value === 'true' ? 'is-on' : 'is-off'}`}
                      type="button"
                      aria-pressed={field.value === 'true'}
                      disabled={employmentStatus === 'Resigned' || isSaving}
                      onClick={() => {
                        if (savedMember.isPublished) {
                          confirmation.open()
                          return
                        }

                        void publishMember()
                      }}
                    >
                      <span>{field.value === 'true' ? 'Đã đăng' : 'Chưa đăng'}</span>
                      <span className="team-member-edit__toggle-track" aria-hidden="true">
                        <span className="team-member-edit__toggle-thumb" />
                      </span>
                    </button>
                  )}
                />
                {employmentStatus === 'Resigned' && (
                  <span className="team-member-edit__hint">Thành viên đã nghỉ không thể được đăng.</span>
                )}
                {errors.root && <p className="team-member-edit__form-error" role="alert">{errors.root.message}</p>}
              </div>
            </div>

            <dl className="team-member-edit__status-meta">
              <div>
                <dt>Tài khoản</dt>
                <dd>{savedMember.isActive ? 'Đang hoạt động' : 'Không hoạt động'}</dd>
              </div>
              <div>
                <dt>Thứ tự hiển thị</dt>
                <dd>{savedMember.displayOrder ?? '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>

      </Form>

      <Modal.Root state={confirmation}>
        <Modal.Backdrop className="team-member-confirm__backdrop" isDismissable={!isSaving}>
          <Modal.Container className="team-member-confirm__container" placement="center" size="md">
            <Modal.Dialog className="team-member-confirm__dialog">
              <Modal.Header className="team-member-confirm__header">
                <Modal.Icon className="team-member-confirm__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="team-member-confirm__heading">
                    Xác nhận gỡ đăng thành viên?
                  </Modal.Heading>
                </div>
              </Modal.Header>

              <Modal.Body className="team-member-confirm__body">
                <p>Thành viên sẽ không còn hiển thị trên website công khai. Bạn vẫn có thể chỉnh sửa hồ sơ sau khi gỡ đăng.</p>
              </Modal.Body>

              <Modal.Footer className="team-member-confirm__footer">
                <Button type="button" variant="outline" isDisabled={isSaving} onClick={closeUnpublishConfirmation}>
                  Hủy
                </Button>
                <Button
                  className="team-member-confirm__submit"
                  type="button"
                  variant="primary"
                  isDisabled={isSaving}
                  onClick={() => void confirmUnpublish()}
                >
                  {isSaving ? 'Đang xử lý...' : 'Xác nhận'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <Modal.Root state={leaveConfirmation}>
        <Modal.Backdrop className="team-member-confirm__backdrop" isDismissable={!isSaving}>
          <Modal.Container className="team-member-confirm__container" placement="center" size="md">
            <Modal.Dialog className="team-member-confirm__dialog">
              <Modal.Header className="team-member-confirm__header">
                <Modal.Icon className="team-member-confirm__icon">
                  <AlertTriangle size={22} aria-hidden="true" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="team-member-confirm__heading">
                    Rời khỏi trang chỉnh sửa?
                  </Modal.Heading>
                </div>
              </Modal.Header>
              <Modal.Body className="team-member-confirm__body">
                <p>Thông tin chưa được lưu có thể bị mất.</p>
              </Modal.Body>
              <Modal.Footer className="team-member-confirm__footer">
                <Button type="button" variant="outline" isDisabled={isSaving} onClick={closeLeaveConfirmation}>
                  Tiếp tục chỉnh sửa
                </Button>
                <Button
                  className="team-member-confirm__submit"
                  type="button"
                  variant="primary"
                  isDisabled={isSaving}
                  onClick={confirmNavigation}
                >
                  Rời khỏi trang
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </section>
  )
}

export function EditTeamMemberForm({ id }: EditTeamMemberFormProps) {
  const navigate = useNavigate()
  const { data, error, isPending, refetch } = useTeamMemberDetail(id)

  if (isPending) return <MemberEditSkeleton />

  if (!data || error) {
    return (
      <section className="team-member-edit__error">
        <h1>Không thể chỉnh sửa thành viên</h1>
        <p>{getDetailErrorMessage(error)}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTE_PATHS.MEMBERS, { state: { memberNavigation: 'back-to-list' } })}
          >
            Quay lại danh sách
          </Button>
          <Button type="button" variant="primary" onClick={() => void refetch()}>Thử lại</Button>
        </div>
      </section>
    )
  }

  return <EditFormContent key={data.id} member={data} />
}
