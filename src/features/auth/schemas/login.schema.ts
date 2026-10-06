import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email.')
    .email('Email không hợp lệ.')
    .max(320, 'Email không được vượt quá 320 ký tự.'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu.')
    .max(256, 'Mật khẩu không được vượt quá 256 ký tự.'),
})
