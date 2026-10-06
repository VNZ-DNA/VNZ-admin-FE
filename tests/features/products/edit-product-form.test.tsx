import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditProductForm } from '@/features/products/components/edit-product-form'
import { productService } from '@/features/products/services/product.service'
import type { ProductDetail } from '@/features/products/types'

const product: ProductDetail = {
  id: 'product-id',
  name: 'VNZ Product',
  logoUrl: 'https://cdn.vnz.vn/logo.png',
  wordmarkUrl: 'https://cdn.vnz.vn/wordmark.png',
  productUrl: 'https://vnz.vn/product',
  content: {
    blocks: [
      { id: 'title-id', type: 'Title', order: 1, text: '<p>Product title</p>', items: null },
      { id: 'description-id', type: 'Description', order: 2, text: '<p>Product description</p>', items: null },
      { id: 'category-id', type: 'Category', order: 3, text: '<p>Analytics</p>', items: null },
      { id: 'feature-id', type: 'Feature', order: 4, text: null, items: [{ id: 'feature-item-id', title: 'Reports' }] },
    ],
  },
  status: 'Completed',
  isPublished: false,
  displayOrder: null,
  createdBy: 'admin-id',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
  translations: null,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderEdit(currentProduct: ProductDetail = product) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  vi.spyOn(productService, 'getProduct').mockResolvedValue(currentProduct)

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditProductForm id={currentProduct.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EditProductForm TDD-022 flow', () => {
  it('matches the create toolbar placement and detail status stack', async () => {
    renderEdit()

    await screen.findByDisplayValue('VNZ Product')

    expect(screen.queryByRole('heading', { name: 'VNZ Product' })).toBeNull()

    const toolbar = document.querySelector('.product-edit__toolbar')
    const sheet = document.querySelector('.product-edit__sheet')
    const statusStack = document.querySelector('.product-edit__status-stack')

    expect(toolbar).toBeTruthy()
    expect(sheet).toBeTruthy()
    expect(toolbar!.compareDocumentPosition(sheet!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(statusStack).toBeTruthy()
    expect(statusStack?.querySelector('.product-edit__publish-toggle')).toBeTruthy()
  })

  it('uses the create two-column layout for editable product fields', async () => {
    renderEdit()

    await screen.findByDisplayValue('VNZ Product')

    const summary = document.querySelector('.product-edit__summary-card')
    const layout = document.querySelector('.product-edit__sheet .product-create__layout')
    const assetsColumn = layout?.querySelector('.product-create__assets-column')
    const contentColumn = layout?.querySelector('.product-create__content-column')

    expect(summary?.querySelector('input[name="name"]')).toBeTruthy()
    expect(document.querySelector('.product-edit__top-grid')).toBeNull()
    expect(layout).toBeTruthy()
    expect(assetsColumn?.querySelector('input[name="productUrl"]')).toBeTruthy()
    expect(assetsColumn?.querySelector('.product-media--inline')).toBeTruthy()
    expect(contentColumn?.querySelector('.product-edit__content-section')).toBeTruthy()
    expect(contentColumn?.querySelector('.product-edit__state-fieldset')).toBeTruthy()
  })

  it('matches the create feature layout and removes feature rows', async () => {
    const featureProduct: ProductDetail = {
      ...product,
      content: {
        blocks: product.content!.blocks.map((block) =>
          block.type === 'Feature'
            ? {
                ...block,
                items: [
                  { id: 'feature-item-1', title: 'Reports' },
                  { id: 'feature-item-2', title: 'Dashboards' },
                ],
              }
            : block,
        ),
      },
    }
    renderEdit(featureProduct)

    await screen.findByDisplayValue('VNZ Product')

    expect(screen.queryByText(/Cập nhật lần cuối/)).toBeNull()

    const featureSection = document.querySelector('.product-content-block--feature')
    expect(featureSection).toBeTruthy()
    expect(featureSection?.querySelector('.product-content-block__title')).toBeTruthy()
    expect(featureSection?.querySelector('.product-content-block__body--feature .product-create__feature-field')).toBeTruthy()
    expect(featureSection?.querySelectorAll('.product-create__feature-row')).toHaveLength(2)

    const featureField = within(featureSection as HTMLElement)
    fireEvent.click(featureField.getByRole('button', { name: 'Xóa feature 1' }))

    expect(featureSection?.querySelectorAll('.product-create__feature-row')).toHaveLength(1)
    expect(screen.getByDisplayValue('Dashboards')).toBeTruthy()
  })

  it('reorders content by dragging a block title before saving', async () => {
    const update = vi.spyOn(productService, 'updateProduct').mockResolvedValue(product)
    renderEdit()

    await screen.findByDisplayValue('VNZ Product')

    const title = screen.getByRole('button', { name: 'Sắp xếp TITLE' })
    const feature = screen.getByRole('button', { name: 'Sắp xếp FEATURE' })
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('title-id'),
    }

    fireEvent.dragStart(title, { dataTransfer })
    fireEvent.dragOver(feature, { dataTransfer })
    fireEvent.drop(feature, { dataTransfer })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    const savedPayload = update.mock.calls[0]?.[1] as { content?: { blocks: Array<{ type: string; order: number }> } }
    expect(savedPayload.content?.blocks.map((block) => [block.type, block.order])).toEqual([
      ['Description', 1],
      ['Category', 2],
      ['Feature', 3],
      ['Title', 4],
    ])
  })

  it('saves profile fields without changing publication state in the same request', async () => {
    const update = vi.spyOn(productService, 'updateProduct').mockResolvedValue(product)
    renderEdit()

    const name = await screen.findByDisplayValue('VNZ Product')
    fireEvent.change(name, { target: { value: 'VNZ Product Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(product.id, expect.not.objectContaining({ isPublished: expect.anything() }))
  })

  it('publishes through the summary toggle when the profile is clean', async () => {
    const update = vi.spyOn(productService, 'updateProduct').mockResolvedValue({ ...product, isPublished: true })
    renderEdit()

    await screen.findByDisplayValue('VNZ Product')
    const toggle = screen.getByRole('button', { name: 'Hiển thị sản phẩm trên website' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)

    await waitFor(() => expect(update).toHaveBeenCalledWith(product.id, expect.objectContaining({
      isPublished: true,
      expectedUpdatedAt: product.updatedAt,
      translations: expect.anything(),
    })))
  })

  it('disables the summary toggle while profile changes are unsaved', async () => {
    renderEdit()

    const name = await screen.findByDisplayValue('VNZ Product')
    fireEvent.change(name, { target: { value: 'VNZ Product Updated' } })

    const toggle = screen.getByRole('button', { name: 'Hiển thị sản phẩm trên website' }) as HTMLButtonElement
    expect(toggle.disabled).toBe(true)
  })

  it('requires confirmation before unpublishing a published product', async () => {
    const publishedProduct = { ...product, isPublished: true }
    const update = vi.spyOn(productService, 'updateProduct').mockResolvedValue({ ...publishedProduct, isPublished: false })
    renderEdit(publishedProduct)

    await screen.findByDisplayValue('VNZ Product')
    const toggle = screen.getByRole('button', { name: 'Hiển thị sản phẩm trên website' })
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(toggle)

    expect(screen.getByRole('heading', { name: 'Gỡ đăng sản phẩm?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith(product.id, expect.objectContaining({ isPublished: false, expectedUpdatedAt: product.updatedAt })))
  })

  it('loads English content into the English tab without changing shared block identities', async () => {
    renderEdit({
      ...product,
      translations: {
        en: {
          content: {
            blocks: [
              { id: 'title-id', type: 'Title', order: 1, text: '<p>English title</p>', items: null },
              { id: 'description-id', type: 'Description', order: 2, text: '<p>English description</p>', items: null },
              { id: 'category-id', type: 'Category', order: 3, text: '<p>Analytics</p>', items: null },
              { id: 'feature-id', type: 'Feature', order: 4, text: null, items: [{ id: 'feature-item-id', title: 'Reports' }] },
            ],
          },
        },
      },
    })

    await screen.findByDisplayValue('VNZ Product')
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))

    expect(screen.getByText('English title')).toBeTruthy()
    expect(screen.getByDisplayValue('Reports')).toBeTruthy()
  })
})
