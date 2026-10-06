import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProductDetail } from '@/features/products/components/product-detail'
import { productService } from '@/features/products/services/product.service'
import type { ProductDetail as ProductDetailData } from '@/features/products/types'

const product: ProductDetailData = {
  id: 'product-id',
  name: 'VNZ Product',
  logoUrl: null,
  wordmarkUrl: null,
  productUrl: 'https://vnz.vn/product',
  content: {
    blocks: [
      { id: 'title-id', type: 'Title', order: 1, text: '<p>Tiêu đề VI</p>', items: null },
      { id: 'description-id', type: 'Description', order: 2, text: '<p>Mô tả VI</p>', items: null },
      { id: 'feature-id', type: 'Feature', order: 3, text: null, items: [{ id: 'feature-item-id', title: 'Tính năng VI' }] },
    ],
  },
  status: 'Completed',
  isPublished: false,
  displayOrder: null,
  createdBy: 'admin-id',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
  translations: {
    en: {
      content: {
        blocks: [
          { id: 'title-id', type: 'Title', order: 1, text: '<p>English title</p>', items: null },
          { id: 'description-id', type: 'Description', order: 2, text: '<p>English description</p>', items: null },
          { id: 'feature-id', type: 'Feature', order: 3, text: null, items: [{ id: 'feature-item-id', title: 'English feature' }] },
        ],
      },
    },
  },
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderDetail(currentProduct: ProductDetailData = product) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  vi.spyOn(productService, 'getProduct').mockResolvedValue(currentProduct)

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductDetail id={currentProduct.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductDetail bilingual content', () => {
  it('switches Product Content and the summary description between VI and EN', async () => {
    renderDetail()

    await screen.findByText('Tiêu đề VI')
    expect(screen.getAllByText('Mô tả VI')).toHaveLength(2)
    expect(screen.getByText('Tính năng VI')).toBeTruthy()
    expect(screen.queryByText('English title')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'English' }))

    expect(screen.getByText('English title')).toBeTruthy()
    expect(screen.getByText('English description')).toBeTruthy()
    expect(screen.getByText('Mô tả VI')).toBeTruthy()
    expect(screen.getByText('English feature')).toBeTruthy()
    expect(screen.queryByText('Tiêu đề VI')).toBeNull()
    expect(screen.queryByText('Tính năng VI')).toBeNull()
  })

  it('keeps EN empty instead of falling back to VI', async () => {
    renderDetail({ ...product, translations: null })

    await screen.findByText('Tiêu đề VI')
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))

    expect(screen.getByText('Bản nháp này chưa có nội dung English.')).toBeTruthy()
    expect(screen.queryByText('Tiêu đề VI')).toBeNull()
  })
})
