import { afterEach, describe, expect, it, vi } from 'vitest'

import { productService } from '@/features/products/services/product.service'
import { api } from '@/lib/http/axios'
import type { UpdateProductRequest } from '@/features/products/types'

afterEach(() => vi.restoreAllMocks())

function mockUpdateResponse() {
  vi.spyOn(api, 'put').mockResolvedValue({
    data: {
      isSuccess: true,
      message: 'OK',
      data: { id: 'product-id' },
      errors: null,
      traceId: 'trace-id',
      timestampUtc: '2026-10-05T00:00:00Z',
    },
  })
}

describe('Product update service', () => {
  it('saves the profile without sending isPublished', async () => {
    mockUpdateResponse()

    await productService.updateProduct('product-id', {
      name: 'VNZ Product',
      productUrl: 'https://vnz.vn/product',
      status: 'Completed',
      content: null,
    } as unknown as UpdateProductRequest)

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect(body.get('name')).toBe('VNZ Product')
    expect(body.get('status')).toBe('Completed')
    expect(body.get('productUrl')).toBe('https://vnz.vn/product')
    expect(body.has('isPublished')).toBe(false)
  })

  it('sends the full payload for publish', async () => {
    mockUpdateResponse()

    await productService.updateProduct('product-id', {
      name: 'VNZ Product',
      productUrl: null,
      status: 'Completed',
      content: null,
      isPublished: true,
      translations: { en: { content: null } },
      expectedUpdatedAt: '2026-10-05T00:00:00Z',
    } as UpdateProductRequest)

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect([...body.keys()]).toEqual(['name', 'status', 'isPublished', 'expectedUpdatedAt'])
    expect(body.get('isPublished')).toBe('true')
  })

  it('sends only isPublished=false for unpublish', async () => {
    mockUpdateResponse()

    await productService.updateProduct('product-id', { isPublished: false })

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect([...body.keys()]).toEqual(['isPublished'])
    expect(body.get('isPublished')).toBe('false')
  })
})
