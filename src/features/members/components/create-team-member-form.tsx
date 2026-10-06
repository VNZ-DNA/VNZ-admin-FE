import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Card, FieldError, Form, Input, Label, TextField } from '@heroui/react'
import axios from 'axios'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { TeamMemberMediaManager } from '@/features/members/components/team-member-media-manager'
import { useCreateTeamMember } from '@/features/members/hooks/use-create-team-member'
import { buildTeamMemberMediaFiles, createTeamMemberMediaDraft, type TeamMemberMediaDraft } from '@/features/members/member-media'
import {
  createTeamMemberSchema,
  type CreateTeamMemberFormValues,
} from '@/features/members/schemas/create-team-member.schema'
import {
  TEAM_MEMBER_JOB_LEVELS,
  type CreateTeamMemberRequest,
  type TeamMemberJobLevel,
} from '@/features/members/types'
import type { ApiResponse } from '@/lib/http/api-response'
import { ROUTE_PATHS } from '@/routes/route-paths'

const DEFAULT_MEMBER_PASSWORD = 'Vnz@123456'

const jobLevelLabels: Record<TeamMemberJobLevel, string> = {
  Intern: 'Intern',
  Fresher: 'Fresher',
  Junior: 'Junior',
  Middle: 'Middle',
  Senior: 'Senior',
  Lead: 'Lead',
}

function toNullableString(value: string): string | null {
  const trimmedValue = value.trim()
  return trimmedValue || null
}

function getCreateMemberErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || 'Không thể tạo thành viên. Vui lòng thử lại.'
  }

  return 'Không thể tạo thành viên. Vui lòng thử lại.'
}

export function CreateTeamMemberForm() {
  const navigate = useNavigate()
  const createMemberMutation = useCreateTeamMember()
  const [media, setMedia] = useState<TeamMemberMediaDraft>(() => createTeamMemberMediaDraft())
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamMemberFormValues>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      fullName: '',
      displayName: '',
      email: '',
      position: '',
      jobLevel: '',
      joinedDate: '',
      animationUrl: '',
      hometown: '',
      hobbies: '',
      personalQuote: '',
    },
  })

  const isSaving = isSubmitting || createMemberMutation.isPending

  const goBack = () => navigate(ROUTE_PATHS.MEMBERS)

  async function onSubmit(values: CreateTeamMemberFormValues) {
    const payload: CreateTeamMemberRequest = {
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
      ...buildTeamMemberMediaFiles(media),
    }

    try {
      await createMemberMutation.mutateAsync(payload)
      navigate(ROUTE_PATHS.MEMBERS)
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
        const fields = error.response?.data?.errors?.fields ?? []

        if (error.response?.status === 409 && fields.includes('email')) {
          setError('email', {
            type: 'server',
            message: error.response.data?.message || 'Email đã được sử dụng.',
          })
          return
        }

        if (fields.includes('displayName')) {
          setError('displayName', {
            type: 'server',
            message: error.response?.data?.message || 'Tên hiển thị chưa hợp lệ.',
          })
          return
        }
      }

      setError('root', {
        type: 'server',
        message: getCreateMemberErrorMessage(error),
      })
    }
  }

  return (
    <section className="team-member-create">
      <nav className="team-member-create__breadcrumb" aria-label="Breadcrumb">
        <Link to={ROUTE_PATHS.MEMBERS}>Thành viên</Link>
        <ChevronRight aria-hidden="true" size={13} />
        <span>Tạo thành viên mới</span>
      </nav>

      <Form
        className="team-member-create__form"
        onSubmit={handleSubmit(onSubmit)}
        validationBehavior="aria"
      >
        <div className="team-member-create__actions" aria-label="Thao tác biểu mẫu">
          <Button
            className="team-member-create__cancel"
            type="button"
            variant="outline"
            isDisabled={isSaving}
            onClick={goBack}
          >
            Hủy
          </Button>
          <Button
            className="team-member-create__submit"
            type="submit"
            variant="primary"
            isDisabled={isSaving}
          >
            {isSaving ? 'Đang tạo...' : 'Tạo thành viên'}
          </Button>
        </div>

        <div className="team-member-create__layout">
          <Card className="team-member-create__card team-member-create__content-card">
            <div className="team-member-create__profile-preview">
              <span className="team-member-create__avatar-placeholder" aria-hidden="true">
                <Plus size={19} strokeWidth={2.2} />
              </span>
              <div>
                <strong>Thành viên mới</strong>
              </div>
            </div>

            <div className="team-member-create__section">
              <h2>Thông tin cơ bản</h2>
              <div className="team-member-create__basic-columns">
                <div className="team-member-create__basic-column">
                  <div className="team-member-create__name-row">
                    <TextField className="team-member-create__field" isInvalid={Boolean(errors.fullName)}>
                      <Label>
                        Họ và tên <span className="team-member-create__required" aria-hidden="true">*</span>
                      </Label>
                      <Input
                        autoComplete="name"
                        placeholder="Nhập họ và tên"
                        {...register('fullName')}
                      />
                      {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
                    </TextField>

                    <TextField className="team-member-create__field team-member-create__field--display-name" isInvalid={Boolean(errors.displayName)}>
                      <Label>Tên hiển thị</Label>
                      <Input placeholder="VD: TAN" maxLength={100} {...register('displayName')} />
                      {errors.displayName && <FieldError>{errors.displayName.message}</FieldError>}
                    </TextField>
                  </div>

                  <TextField className="team-member-create__field team-member-create__field--email" isInvalid={Boolean(errors.email)}>
                    <Label>
                      Email <span className="team-member-create__required" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="Nhập email đăng nhập"
                      {...register('email')}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  </TextField>

                  <TextField className="team-member-create__field team-member-create__field--hometown">
                    <Label>Quê quán</Label>
                    <Input placeholder="Nhập quê quán" {...register('hometown')} />
                  </TextField>

                  <TextField className="team-member-create__field team-member-create__field--joined-date" isInvalid={Boolean(errors.joinedDate)}>
                    <Label>
                      Ngày tham gia <span className="team-member-create__required" aria-hidden="true">*</span>
                    </Label>
                    <Input type="date" {...register('joinedDate')} />
                    {errors.joinedDate && <FieldError>{errors.joinedDate.message}</FieldError>}
                  </TextField>
                </div>

                <div className="team-member-create__basic-column">
                  <TextField className="team-member-create__field" isInvalid={Boolean(errors.position)}>
                    <Label>
                      Vị trí <span className="team-member-create__required" aria-hidden="true">*</span>
                    </Label>
                    <Input placeholder="Nhập vị trí" {...register('position')} />
                    {errors.position && <FieldError>{errors.position.message}</FieldError>}
                  </TextField>

                  <TextField className="team-member-create__field" isInvalid={Boolean(errors.jobLevel)}>
                    <Label>
                      Cấp bậc <span className="team-member-create__required" aria-hidden="true">*</span>
                    </Label>
                    <select className="team-member-create__select" {...register('jobLevel')}>
                      <option value="">Chọn cấp bậc</option>
                      {TEAM_MEMBER_JOB_LEVELS.map((jobLevel) => (
                        <option key={jobLevel} value={jobLevel}>
                          {jobLevelLabels[jobLevel]}
                        </option>
                      ))}
                    </select>
                    {errors.jobLevel && <FieldError>{errors.jobLevel.message}</FieldError>}
                  </TextField>
                </div>
              </div>
            </div>

            <div className="team-member-create__section">
              <h2>Thông tin hồ sơ</h2>
              <div className="team-member-create__profile-grid">
                <TeamMemberMediaManager value={media} onChange={setMedia} disabled={isSaving} />

                <TextField className="team-member-create__field">
                  <Label>Animation URL</Label>
                  <Input placeholder="Nhập đường dẫn animation" {...register('animationUrl')} />
                </TextField>

                <TextField className="team-member-create__field">
                  <Label>Sở thích</Label>
                  <textarea
                    className="team-member-create__textarea"
                    placeholder="Nhập sở thích của thành viên"
                    rows={3}
                    {...register('hobbies')}
                  />
                </TextField>

                <TextField className="team-member-create__field">
                  <Label>Châm ngôn sống</Label>
                  <textarea
                    className="team-member-create__textarea"
                    placeholder="Nhập châm ngôn sống"
                    rows={3}
                    {...register('personalQuote')}
                  />
                </TextField>
              </div>
            </div>
          </Card>

          <aside className="team-member-create__status-card">
            <h2>Thông tin hệ thống</h2>
            <TextField className="team-member-create__field team-member-create__field--readonly">
              <Label>Mật khẩu mặc định</Label>
              <Input value={DEFAULT_MEMBER_PASSWORD} readOnly aria-readonly="true" />
            </TextField>
          </aside>
        </div>

        {errors.root && (
          <p className="team-member-create__form-error" role="alert">
            {errors.root.message}
          </p>
        )}
      </Form>
    </section>
  )
}
