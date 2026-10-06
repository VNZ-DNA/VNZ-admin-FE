import { Button } from '@heroui/react'
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

import {
  removeProductMedia,
  setProductMediaFile,
  type ProductMediaDraft,
  type ProductMediaSlotState,
} from '@/features/products/product-media'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

type ProductMediaManagerProps = {
  value: ProductMediaDraft
  onChange: (value: ProductMediaDraft) => void
  disabled?: boolean
  variant?: 'default' | 'create-inline'
}

type ProductMediaKind = keyof ProductMediaDraft

function validateImageFile(file: File): string | null {
  if (file.size === 0) return 'File ảnh không được để trống.'
  if (file.size > MAX_IMAGE_BYTES) return 'Mỗi ảnh không được vượt quá 5 MB.'
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Chỉ hỗ trợ JPG, JPEG, PNG, GIF hoặc WebP.'
  }
  return null
}

function MediaPreview({ slot, label }: { slot: ProductMediaSlotState; label: string }) {
  const objectUrl = useMemo(() => (slot.file ? URL.createObjectURL(slot.file) : null), [slot.file])

  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const src = objectUrl ?? (!slot.removed ? slot.currentUrl : null)

  if (!src) {
    return (
      <div className="product-media__preview-fallback" aria-hidden="true">
        <ImagePlus size={30} />
      </div>
    )
  }

  return <img src={src} alt={`Preview ${label}`} />
}

function getSlotDescription(slot: ProductMediaSlotState): string {
  if (slot.file) return 'File mới sẽ thay ảnh hiện tại khi lưu.'
  if (slot.removed) return 'Ảnh hiện tại sẽ được bỏ khi lưu.'
  if (slot.currentUrl) return 'Đang dùng ảnh đã lưu.'
  return 'Chưa có ảnh.'
}

export function ProductMediaManager({
  value,
  onChange,
  disabled = false,
  variant = 'default',
}: ProductMediaManagerProps) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const wordmarkInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRefs: Record<ProductMediaKind, typeof logoInputRef> = {
    logo: logoInputRef,
    wordmark: wordmarkInputRef,
  }

  const chooseFile = (kind: ProductMediaKind) => {
    inputRefs[kind].current?.click()
  }

  const handleFile = (kind: ProductMediaKind, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const fileError = validateImageFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setError(null)
    onChange(setProductMediaFile(value, kind, file))
  }

  const removeMedia = (kind: ProductMediaKind) => {
    setError(null)
    onChange(removeProductMedia(value, kind))
  }

  const slots: Array<{ kind: ProductMediaKind; label: string; hint: string }> = [
    {
      kind: 'logo',
      label: 'Logo',
      hint: 'Ảnh đại diện dùng ở danh sách và thứ tự hiển thị.',
    },
    {
      kind: 'wordmark',
      label: 'Wordmark',
      hint: 'Ảnh chữ thương hiệu hiển thị sau Logo trên website.',
    },
  ]

  return (
    <section className={`product-media${variant === 'create-inline' ? ' product-media--inline' : ''}`}>
      <div className="product-media__heading">
        <div>
          <h2>MEDIA</h2>
          <p>Logo và Wordmark là hai ảnh độc lập. Có thể để trống khi lưu nháp.</p>
        </div>
      </div>

      <input
        ref={logoInputRef}
        className="product-media__file-input"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        onChange={(event) => handleFile('logo', event)}
        disabled={disabled}
      />
      <input
        ref={wordmarkInputRef}
        className="product-media__file-input"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        onChange={(event) => handleFile('wordmark', event)}
        disabled={disabled}
      />

      <div className="product-media__slots">
        {slots.map(({ kind, label, hint }) => {
          const slot = value[kind]
          const hasVisibleMedia = Boolean(slot.file || (slot.currentUrl && !slot.removed))

          return (
            <article className={`product-media__slot product-media__slot--${kind}`} key={kind}>
              <div
                className={`product-media__slot-header${variant === 'create-inline' ? ' product-create__field-heading' : ''}`}
              >
                <div>
                  <strong>{label}</strong>
                  <p>{hint}</p>
                </div>
                <span>{hasVisibleMedia ? 'Đã có ảnh' : 'Chưa có ảnh'}</span>
              </div>

              <div className="product-media__slot-preview">
                <MediaPreview slot={slot} label={label} />
              </div>

              <p className="product-media__slot-status">{getSlotDescription(slot)}</p>

              <div className="product-media__slot-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isDisabled={disabled}
                  onClick={() => chooseFile(kind)}
                >
                  {hasVisibleMedia ? <RefreshCw size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                  {hasVisibleMedia ? `Thay ${label}` : `Chọn ${label}`}
                </Button>

                {(hasVisibleMedia || slot.removed) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isDisabled={disabled || (!slot.currentUrl && !slot.file)}
                    onClick={() => removeMedia(kind)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Bỏ {label}
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="product-media__help">
        <span>JPG, JPEG, PNG, GIF, WebP</span>
        <span>Tối đa 5 MB/file</span>
        <span>Khi đăng bắt buộc có đủ Logo và Wordmark</span>
      </div>

      {error ? <p className="product-media__error" role="alert">{error}</p> : null}
    </section>
  )
}
