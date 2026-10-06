import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BilingualContentCard } from '@/components/bilingual-content-card'
import { BilingualContentTabs } from '@/components/bilingual-content-tabs'
import type { ContentLocale } from '@/lib/content-locale'

afterEach(cleanup)

function ContentCard() {
  const [locale, setLocale] = useState<ContentLocale>('vi')
  return <BilingualContentCard value={locale} onChange={setLocale}>{locale}</BilingualContentCard>
}

describe('BilingualContentTabs', () => {
  it('marks the selected language and notifies the parent when another language is selected', () => {
    const onChange = vi.fn()

    render(<BilingualContentTabs value="vi" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: 'Tiếng Việt' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'English' }).getAttribute('aria-selected')).toBe('false')

    fireEvent.click(screen.getByRole('tab', { name: 'English' }))

    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('moves selection and focus with arrows, Home and End, and labels the active panel', () => {
    render(<ContentCard />)
    const vietnamese = screen.getByRole('tab', { name: 'Tiếng Việt' })
    const english = screen.getByRole('tab', { name: 'English' })
    const panel = screen.getByRole('tabpanel')

    expect(vietnamese.tabIndex).toBe(0)
    expect(english.tabIndex).toBe(-1)
    fireEvent.keyDown(vietnamese, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(english)
    expect(english.getAttribute('aria-selected')).toBe('true')
    expect(panel.getAttribute('aria-labelledby')).toBe(english.id)
    expect(english.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('lang')).toBe('en')

    fireEvent.keyDown(english, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(vietnamese)
    fireEvent.keyDown(vietnamese, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(english)
    fireEvent.keyDown(english, { key: 'Home' })
    expect(document.activeElement).toBe(vietnamese)
    fireEvent.keyDown(vietnamese, { key: 'End' })
    expect(document.activeElement).toBe(english)
  })

  it('keeps panel IDs distinct when two cards are rendered on a page', () => {
    render(<><ContentCard /><ContentCard /></>)
    const panels = screen.getAllByRole('tabpanel')
    expect(panels[0].id).not.toBe(panels[1].id)
    for (const panel of panels) {
      const activeTab = document.getElementById(panel.getAttribute('aria-labelledby')!)
      expect(activeTab?.getAttribute('aria-controls')).toBe(panel.id)
    }
  })

  it('announces which language has validation errors without marking the other language', () => {
    render(<BilingualContentTabs value="vi" onChange={vi.fn()} errorLocales={['en']} />)
    expect(screen.getByRole('tab', { name: 'English (có lỗi)' }).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Tiếng Việt' }).hasAttribute('aria-invalid')).toBe(false)
  })
})
