import { z } from 'zod'

import { TEAM_MEMBER_JOB_LEVELS, type TeamMemberJobLevel } from '@/features/members/types'

export const createTeamMemberSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.').max(200, 'Họ và tên không được vượt quá 200 ký tự.'),
  displayName: z.string().trim().max(100, 'Tên hiển thị không được vượt quá 100 ký tự.'),
  email: z.string().trim().min(1, 'Vui lòng nhập email.').email('Email không hợp lệ.').max(320, 'Email không được vượt quá 320 ký tự.'),
  position: z.string().trim().min(1, 'Vui lòng nhập vị trí.').max(200, 'Vị trí không được vượt quá 200 ký tự.'),
  jobLevel: z
    .string()
    .min(1, 'Vui lòng chọn cấp bậc.')
    .refine(
      (value) => TEAM_MEMBER_JOB_LEVELS.includes(value as TeamMemberJobLevel),
      'Cấp bậc không hợp lệ.',
    ),
  joinedDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày tham gia.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Ngày tham gia không hợp lệ.'),
  hometown: z.string(),
  hobbies: z.string(),
  personalQuote: z.string(),
})

export type CreateTeamMemberFormValues = z.infer<typeof createTeamMemberSchema>
