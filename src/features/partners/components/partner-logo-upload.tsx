import { Button } from '@heroui/react'
import { ImagePlus, RefreshCw, Upload } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

import { PartnerLogoPreview } from '@/features/partners/components/partner-logo-preview'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

type PartnerLogoUploadProps = {
  currentUrl: string | null
  file?: File
  disabled?: boolean
  onFileChange: (file: File) => void
}

function validateImageFile(file: File): string | null {
  if (file.size === 0) return 'File ảnh không được để trống.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh không được vượt quá 5 MB.'
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return 'Chỉ hỗ trợ JPG, JPEG, PNG, GIF hoặc WebP.'
  return null
}

export function PartnerLogoUpload({
  currentUrl,
  file,
  disabled = false,
  onFileChange,
}: PartnerLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const previewUrl = objectUrl ?? currentUrl

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return

    const fileError = validateImageFile(selectedFile)
    if (fileError) {
      setError(fileError)
      return
    }

    setError(null)
    onFileChange(selectedFile)
  }

  return (
    <section className="partner-logo-upload" aria-labelledby="partner-logo-upload-heading">
      <div className="partner-logo-upload__heading">
        <h2 id="partner-logo-upload-heading">ASSETS</h2>
        <span>Logo</span>
      </div>

      <div className="partner-logo-upload__preview">
        {previewUrl ? (
          <PartnerLogoPreview src={previewUrl} alt="Preview logo đối tác" />
        ) : (
          <div className="partner-logo-upload__empty" aria-hidden="true">
            <ImagePlus size={30} />
            <span>Chưa có logo</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        className="partner-logo-upload__input"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        aria-label="Logo đối tác"
        onChange={handleFile}
        disabled={disabled}
      />

      <div className="partner-logo-upload__actions">
        <Button
          type="button"
          variant="outline"
          isDisabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? <RefreshCw size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
          {previewUrl ? 'Thay logo' : 'Chọn logo'}
        </Button>
      </div>

      <p className="partner-logo-upload__hint">
        {file ? 'Ảnh mới sẽ thay logo hiện tại khi lưu.' : 'JPG, JPEG, PNG, GIF hoặc WebP · tối đa 5 MB'}
      </p>
      {error ? <p className="partner-logo-upload__error" role="alert">{error}</p> : null}
    </section>
  )
}
