import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CreateProductForm } from '@/features/products/components/create-product-form'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderCreate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateProductForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateProductForm content ordering', () => {
  it('reorders blocks by dragging their visible title', () => {
    renderCreate()

    const title = screen.getByRole('button', { name: 'Sắp xếp TITLE' })
    const feature = screen.getByRole('button', { name: 'Sắp xếp FEATURE' })
    let transferValue = ''
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn((_type: string, value: string) => {
        transferValue = value
      }),
      getData: vi.fn(() => transferValue),
    }

    fireEvent.dragStart(title, { dataTransfer })
    fireEvent.dragOver(feature, { dataTransfer })
    fireEvent.drop(feature, { dataTransfer })

    expect(
      [...document.querySelectorAll('.product-content-block__title strong')].map((element) => element.textContent),
    ).toEqual(['DESCRIPTION', 'CATEGORY', 'FEATURE', 'TITLE'])
  })

  it('switches between Vietnamese and English content editors', () => {
    renderCreate()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('tab', { name: 'English' }))

    expect(screen.getByRole('tab', { name: 'English' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('lang')).toBe('en')
  })
})
