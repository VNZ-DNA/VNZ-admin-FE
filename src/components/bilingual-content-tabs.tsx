import { useId, useRef, type ReactNode } from 'react'
import type { ContentLocale } from '@/lib/content-locale'

type BilingualContentTabsProps = {
  value: ContentLocale
  onChange: (locale: ContentLocale) => void
  className?: string
  panelId?: string
  errorLocales?: readonly ContentLocale[]
}

type TabDefinition = {
  label: string
  locale: ContentLocale
}

const TABS: readonly TabDefinition[] = [
  { locale: 'vi', label: 'Tiếng Việt' },
  { locale: 'en', label: 'English' },
]

function TabShape(): ReactNode {
  return (
    <svg aria-hidden="true" className="bilingual-content-tabs__shape" preserveAspectRatio="none" viewBox="0 0 100 28">
      <path d="M 2 28 C 11 28, 12 20, 12 15 L 12 8 C 12 3, 16 1, 22 1 L 78 1 C 84 1, 88 3, 88 8 L 88 15 C 88 20, 89 28, 98 28 Z" />
    </svg>
  )
}

export function BilingualContentTabs({ value, onChange, className = '', panelId, errorLocales = [] }: BilingualContentTabsProps) {
  const id = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabIdPrefix = panelId ?? id

  return (
    <div className={`bilingual-content-tabs ${className}`.trim()} role="tablist" aria-label="Ngôn ngữ nội dung">
      {TABS.map((tab, index) => {
        const isActive = tab.locale === value
        const hasError = errorLocales.includes(tab.locale)

        return (
          <button
            key={tab.locale}
            id={`${tabIdPrefix}-tab-${tab.locale}`}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            className="bilingual-content-tabs__tab"
            type="button"
            role="tab"
            aria-label={hasError ? `${tab.label} (có lỗi)` : tab.label}
            aria-controls={panelId}
            aria-selected={isActive}
            aria-invalid={hasError || undefined}
            tabIndex={isActive ? 0 : -1}
            data-active={isActive}
            data-invalid={hasError}
            onClick={() => onChange(tab.locale)}
            onKeyDown={(event) => {
              let nextIndex: number
              switch (event.key) {
                case 'ArrowRight':
                  nextIndex = (index + 1) % TABS.length
                  break
                case 'ArrowLeft':
                  nextIndex = (index - 1 + TABS.length) % TABS.length
                  break
                case 'Home':
                  nextIndex = 0
                  break
                case 'End':
                  nextIndex = TABS.length - 1
                  break
                default:
                  return
              }
              event.preventDefault()
              onChange(TABS[nextIndex].locale)
              tabRefs.current[nextIndex]?.focus()
            }}
          >
            <TabShape />
            <span className="bilingual-content-tabs__label">{tab.locale.toUpperCase()}</span>
          </button>
        )
      })}
    </div>
  )
}
