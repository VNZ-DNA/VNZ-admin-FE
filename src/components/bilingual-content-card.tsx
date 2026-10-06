import { useId, type ReactNode } from 'react'

import { BilingualContentTabs } from '@/components/bilingual-content-tabs'
import type { ContentLocale } from '@/lib/content-locale'

type BilingualContentCardProps = {
  value: ContentLocale
  onChange: (locale: ContentLocale) => void
  children: ReactNode
  sharedSection?: ReactNode
  className?: string
  errorLocales?: readonly ContentLocale[]
}

export function BilingualContentCard({
  value,
  onChange,
  children,
  sharedSection,
  className = '',
  errorLocales,
}: BilingualContentCardProps) {
  const panelId = useId()

  return (
    <article className={`bilingual-content-card ${className}`.trim()}>
      <BilingualContentTabs
        className="bilingual-content-card__tabs"
        panelId={panelId}
        value={value}
        onChange={onChange}
        errorLocales={errorLocales}
      />
      <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${value}`} tabIndex={0} lang={value}>
        {children}
      </div>
      {sharedSection && (
        <div className="bilingual-content-card__shared-section">
          {sharedSection}
        </div>
      )}
    </article>
  )
}
