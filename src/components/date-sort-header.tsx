import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DateSortDirection } from '@/lib/date-sort'
import '@/styles/date-sort.css'

type DateSortHeaderProps = {
  label: string
  value?: DateSortDirection
  error?: string | null
  onChange: (value: DateSortDirection | undefined) => void
}

export function DateSortHeader({ label, value, error, onChange }: DateSortHeaderProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const Icon = value === 'asc' ? ArrowUp : value === 'desc' ? ArrowDown : ChevronsUpDown

  useEffect(() => {
    if (!position) return
    const selected = menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
    const firstOption = menuRef.current?.querySelector<HTMLButtonElement>('button')
    const focusTarget = selected ?? firstOption
    focusTarget?.focus()
    function closeOutside(event: PointerEvent) {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setPosition(null)
    }
    function closeOnScroll(event: Event) {
      if (!menuRef.current?.contains(event.target as Node)) setPosition(null)
    }
    function closeOnResize() { setPosition(null) }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnResize)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnResize)
    }
  }, [position])

  function closeMenu() {
    setPosition(null)
    triggerRef.current?.focus()
  }

  return (
    <th scope="col" aria-sort={value === 'asc' ? 'ascending' : value === 'desc' ? 'descending' : 'none'}>
      <button ref={triggerRef} type="button" className={`date-sort__trigger${value ? ' is-active' : ''}${error ? ' is-invalid' : ''}`}
        aria-label={`Sắp xếp ${label}`} aria-haspopup="menu" aria-expanded={Boolean(position)} title={error || undefined}
        onClick={() => {
          if (position) { closeMenu(); return }
          const rect = triggerRef.current!.getBoundingClientRect()
          setPosition({
            top: Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 130)),
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 168)),
          })
        }}>
        <span>{label}</span><Icon size={14} aria-hidden="true" />
      </button>
      {error && <span className="sr-only" role="alert">{label}: {error}</span>}
      {position && createPortal(
        <div ref={menuRef} className="date-sort__menu" role="menu" aria-label={`Sắp xếp ${label}`} style={position}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPosition(null) }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); closeMenu() }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const buttons = Array.from(menuRef.current!.querySelectorAll<HTMLButtonElement>('button'))
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
              buttons[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + 1) % buttons.length]?.focus()
            }
          }}>
          {(['asc', 'desc'] as const).map((direction) => {
            const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown
            return <button key={direction} type="button" role="menuitemradio" aria-checked={value === direction} onClick={() => { onChange(value === direction ? undefined : direction); closeMenu() }}>
              <DirectionIcon size={15} aria-hidden="true" />{direction === 'asc' ? 'Tăng dần' : 'Giảm dần'}
            </button>
          })}
          {error && <p className="date-sort__error">{error}</p>}
        </div>, document.body,
      )}
    </th>
  )
}
