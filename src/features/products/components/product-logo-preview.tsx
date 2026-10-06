import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

type ProductLogoPreviewProps = {
  src: string | null | undefined
  alt: string
  compact?: boolean
}

export function ProductLogoPreview({ src, alt, compact = false }: ProductLogoPreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const normalizedSrc = src?.trim() || ''
  const hasError = Boolean(normalizedSrc && failedSrc === normalizedSrc)

  return (
    <div className={`product-logo-preview ${compact ? 'product-logo-preview--compact' : ''}`}>
      {normalizedSrc && !hasError ? (
        <img src={normalizedSrc} alt={alt} onError={() => setFailedSrc(normalizedSrc)} />
      ) : (
        <span className="product-logo-preview__fallback" aria-label="Ảnh sản phẩm mặc định">
          <ImageIcon size={compact ? 22 : 34} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}
