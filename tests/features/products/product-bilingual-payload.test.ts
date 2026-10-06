import { afterEach, describe, expect, it, vi } from 'vitest'

import { productService } from '@/features/products/services/product.service'
import { api } from '@/lib/http/axios'
import type { CreateProductRequest, UpdateProductRequest } from '@/features/products/types'

afterEach(() => vi.restoreAllMocks())

const viContent = {
  blocks: [
    { id: 'title-id', type: 'Title' as const, order: 1, text: '<p>Tiêu đề</p>', items: null },
    {
      id: 'feature-id',
      type: 'Feature' as const,
      order: 2,
      text: null,
      items: [{ id: 'feature-item-id', title: 'Tính năng' }],
    },
  ],
}

const enContent = {
  blocks: [
    { id: 'title-id', type: 'Title' as const, order: 1, text: '<p>Title</p>', items: null },
    {
      id: 'feature-id',
      type: 'Feature' as const,
      order: 2,
      text: null,
      items: [{ id: 'feature-item-id', title: 'Feature' }],
    },
  ],
}

function mockResponse() {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { isSuccess: true, message: 'OK', data: { id: 'product-id' }, errors: null },
  })
  vi.spyOn(api, 'put').mockResolvedValue({
    data: { isSuccess: true, message: 'OK', data: { id: 'product-id' }, errors: null },
  })
}

describe('Product bilingual multipart contract', () => {
  it('sends Vietnamese and English content with shared block and item identities on create', async () => {
    mockResponse()

    await productService.createProduct({
      name: 'VNZ Product',
      productUrl: null,
      content: viContent,
      translations: { en: { content: enContent } },
    } as CreateProductRequest)

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.get('content.blocks[0].id')).toBe('title-id')
    expect(body.get('translations.en.content.blocks[0].id')).toBe('title-id')
    expect(body.get('translations.en.content.blocks[0].text')).toBe('<p>Title</p>')
    expect(body.get('translations.en.content.blocks[1].items[0].id')).toBe('feature-item-id')
  })

  it('sends the full bilingual payload when publishing', async () => {
    mockResponse()

    await productService.updateProduct('product-id', {
      name: 'VNZ Product',
      productUrl: null,
      status: 'Completed',
      isPublished: true,
      expectedUpdatedAt: '2026-10-05T00:00:00Z',
      content: viContent,
      translations: { en: { content: enContent } },
    } as UpdateProductRequest)

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect(body.get('isPublished')).toBe('true')
    expect(body.get('expectedUpdatedAt')).toBe('2026-10-05T00:00:00Z')
    expect(body.get('content.blocks[0].text')).toBe('<p>Tiêu đề</p>')
    expect(body.get('translations.en.content.blocks[0].text')).toBe('<p>Title</p>')
  })

  it('keeps unpublish state-only while sending the concurrency token', async () => {
    mockResponse()

    await productService.updateProduct('product-id', {
      isPublished: false,
      expectedUpdatedAt: '2026-10-05T00:00:00Z',
    })

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect([...body.keys()]).toEqual(['isPublished', 'expectedUpdatedAt'])
    expect(body.get('isPublished')).toBe('false')
    expect(body.get('expectedUpdatedAt')).toBe('2026-10-05T00:00:00Z')
  })
})
