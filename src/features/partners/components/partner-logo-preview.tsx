import { Building2 } from 'lucide-react'
import { useState } from 'react'

type PartnerLogoPreviewProps = {
  src: string | null | undefined
  alt: string
  compact?: boolean
}

export function PartnerLogoPreview({ src, alt, compact = false }: PartnerLogoPreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const normalizedSrc = src?.trim() || null
  const showImage = Boolean(normalizedSrc) && failedSrc !== normalizedSrc

  return (
    <div className={`partner-logo-preview ${compact ? 'partner-logo-preview--compact' : ''}`}>
      {showImage ? (
        <img
          src={normalizedSrc ?? undefined}
          alt={alt}
          onError={() => setFailedSrc(normalizedSrc)}
        />
      ) : (
        <span className="partner-logo-preview__fallback" aria-label="Logo mặc định">
          <Building2 size={compact ? 20 : 28} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}