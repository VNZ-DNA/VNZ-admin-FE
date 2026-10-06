import axios from 'axios'

import type { ApiResponse } from '@/lib/http/api-response'

export const NEWS_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp'
export const NEWS_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

export function validateNewsImage(file: File): string | null {
  if (file.size === 0) return 'Ảnh không được là file rỗng.'
  if (!supportedImageTypes.has(file.type)) {
    return 'Ảnh chỉ hỗ trợ JPG, JPEG, PNG, GIF hoặc WebP.'
  }
  if (file.size > NEWS_IMAGE_MAX_BYTES) return 'Ảnh không được vượt quá 5 MB.'
  return null
}

export function getNewsMutationErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) return fallback

  const code = error.response?.data?.errors?.code
  if (code === 'RICH_TEXT_INVALID') {
    return 'Nội dung định dạng chưa hợp lệ hoặc không còn nội dung sau khi hệ thống làm sạch.'
  }
  if (code === 'NEWS_CONTENT_INVALID') {
    return 'Nội dung bài viết có ảnh, gallery hoặc liên kết ảnh chưa hợp lệ.'
  }
  if (code === 'NEWS_IMAGE_ACTION_INVALID') {
    return 'Thao tác với ảnh đại diện không hợp lệ. Vui lòng chọn thay ảnh hoặc xóa ảnh.'
  }
  if (code === 'MEDIA_FILE_TYPE_UNSUPPORTED') {
    return 'Ảnh đại diện chỉ hỗ trợ JPG, JPEG, PNG, GIF hoặc WebP.'
  }
  if (code === 'MEDIA_FILE_TOO_LARGE') return 'Ảnh đại diện không được vượt quá 5 MB.'
  if (code === 'MEDIA_UPLOAD_FAILED') return 'Không thể tải ảnh đại diện lên hệ thống. Vui lòng thử lại.'

  return error.response?.data?.message || fallback
}