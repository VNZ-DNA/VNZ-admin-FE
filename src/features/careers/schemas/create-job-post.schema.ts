import { z } from 'zod'

import { JOB_POST_EMPLOYMENT_TYPES, JOB_POST_LEVELS } from '@/features/careers/types'

const skillSchema = z.object({
  value: z.string(),
})

export const createJobPostFormSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề.').max(300, 'Tiêu đề tối đa 300 ký tự.'),
  expiredDate: z.string(),
  departmentId: z.string(),
  employmentType: z.string(),
  jobLevel: z.string(),
  numberOfPositions: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  requirements: z.string(),
  skills: z.array(skillSchema),
})

export const publishJobPostSchema = createJobPostFormSchema.superRefine((values, context) => {
  if (!values.departmentId) {
    context.addIssue({
      code: 'custom',
      path: ['departmentId'],
      message: 'Vui lòng chọn phòng ban.',
    })
  }

  if (!JOB_POST_EMPLOYMENT_TYPES.includes(values.employmentType as never)) {
    context.addIssue({
      code: 'custom',
      path: ['employmentType'],
      message: 'Vui lòng chọn loại hình làm việc.',
    })
  }

  if (!JOB_POST_LEVELS.includes(values.jobLevel as never)) {
    context.addIssue({
      code: 'custom',
      path: ['jobLevel'],
      message: 'Vui lòng chọn cấp bậc.',
    })
  }

  const numberOfPositions = Number(values.numberOfPositions)
  if (
    !values.numberOfPositions.trim() ||
    !Number.isInteger(numberOfPositions) ||
    numberOfPositions < 1
  ) {
    context.addIssue({
      code: 'custom',
      path: ['numberOfPositions'],
      message: 'Chỉ tiêu phải là số nguyên từ 1 trở lên.',
    })
  }

  if (!values.shortDescription.trim()) {
    context.addIssue({
      code: 'custom',
      path: ['shortDescription'],
      message: 'Vui lòng nhập mô tả ngắn.',
    })
  }

  if (!values.description.trim()) {
    context.addIssue({
      code: 'custom',
      path: ['description'],
      message: 'Vui lòng nhập mô tả công việc.',
    })
  }

  if (!values.requirements.trim()) {
    context.addIssue({
      code: 'custom',
      path: ['requirements'],
      message: 'Vui lòng nhập yêu cầu ứng viên.',
    })
  }

  if (!values.expiredDate || !/^\d{4}-\d{2}-\d{2}$/.test(values.expiredDate)) {
    context.addIssue({
      code: 'custom',
      path: ['expiredDate'],
      message: 'Vui lòng chọn ngày hết hạn.',
    })
  }

  if (!values.skills.some((skill) => skill.value.trim())) {
    context.addIssue({
      code: 'custom',
      path: ['skills'],
      message: 'Vui lòng thêm ít nhất một kỹ năng.',
    })
  }
})

export type CreateJobPostFormValues = z.infer<typeof createJobPostFormSchema>
