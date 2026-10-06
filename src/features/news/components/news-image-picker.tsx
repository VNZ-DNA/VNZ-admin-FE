import { Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { NEWS_IMAGE_ACCEPT, validateNewsImage } from '@/features/news/utils/news-media'

type NewsImagePickerProps = {
  file: File | null
  currentImageUrl?: string | null
  error?: string | null
  disabled?: boolean
  removed?: boolean
  allowRemove?: boolean
  onChange: (file: File | null) => void
  onError: (message: string | null) => void
  onRemove?: () => void
}

export function NewsImagePicker({
  file,
  currentImageUrl = null,
  error = null,
  disabled = false,
  removed = false,
  allowRemove = false,
  onChange,
  onError,
  onRemove,
}: NewsImagePickerProps) {
  const localPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const previewUrl = localPreviewUrl || (removed ? null : currentImageUrl)

  return (
    <div className="news-create__image-field">
      <div className="news-create__label-row">
        <span className="news-create__field-label">Ảnh đại diện</span>
        <span>Tùy chọn · tối đa 5 MB</span>
      </div>

      <div className="news-create__image-frame">
        <div className={`news-create__image-preview ${previewUrl ? 'has-image' : ''}`}>
          {previewUrl ? (
            <img src={previewUrl} alt="Xem trước ảnh đại diện bài viết" />
          ) : (
            <div className="news-create__image-placeholder">
              <ImageIcon size={24} aria-hidden="true" />
              <span>Chưa có ảnh đại diện</span>
            </div>
          )}
        </div>

        <div className="news-create__image-actions">
          <label className={`news-create__image-upload ${disabled ? 'is-disabled' : ''}`}>
            <Upload size={14} aria-hidden="true" />
            <span>{previewUrl ? 'Thay ảnh' : 'Chọn ảnh'}</span>
            <input
              type="file"
              accept={NEWS_IMAGE_ACCEPT}
              disabled={disabled}
              onChange={(event) => {
                const nextFile = event.currentTarget.files?.[0] ?? null
                if (!nextFile) return

                const validationError = validateNewsImage(nextFile)
                if (validationError) {
                  onError(validationError)
                  event.currentTarget.value = ''
                  return
                }

                onError(null)
                onChange(nextFile)
              }}
            />
          </label>

          {allowRemove && previewUrl && (
            <button
              className="news-create__image-remove"
              type="button"
              aria-label="Xóa ảnh đại diện"
              disabled={disabled}
              onClick={() => {
                onError(null)
                onChange(null)
                onRemove?.()
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span className="news-create__image-remove-label">Xóa</span>
            </button>
          )}
        </div>
      </div>

      <small className="news-create__image-help">JPG, JPEG, PNG, GIF hoặc WebP.</small>
      {error && <p className="news-create__field-error" role="alert">{error}</p>}
    </div>
  )
}
