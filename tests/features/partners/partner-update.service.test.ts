import { afterEach, describe, expect, it, vi } from 'vitest'

import { partnerService } from '@/features/partners/services/partner.service'
import { api } from '@/lib/http/axios'

afterEach(() => vi.restoreAllMocks())

describe('Partner update service', () => {
  it('serializes a create request and optional logo as multipart form data', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'partner-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-05T00:00:00Z',
      },
    })

    const logo = new File(['logo'], 'logo.png', { type: 'image/png' })
    await partnerService.createPartner({
      name: 'ABC Logistics',
      websiteUrl: 'https://abc-logistics.vn',
      description: 'Đối tác vận hành của VNZ.',
      logo,
    })

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.get('name')).toBe('ABC Logistics')
    expect(body.get('websiteUrl')).toBe('https://abc-logistics.vn')
    expect(body.get('description')).toBe('Đối tác vận hành của VNZ.')
    expect(body.get('logo')).toBe(logo)
    expect(body.has('logoUrl')).toBe(false)
  })

  it('serializes a profile save and optional logo as multipart form data', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'partner-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-05T00:00:00Z',
      },
    })

    const logo = new File(['logo'], 'logo.png', { type: 'image/png' })
    await partnerService.updatePartner('partner-id', {
      name: 'ABC Logistics',
      logoUrl: 'https://cdn.vnz.vn/partners/current.png',
      websiteUrl: 'https://abc-logistics.vn',
      description: 'Đối tác vận hành của VNZ.',
      logo,
    })

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect(body.get('name')).toBe('ABC Logistics')
    expect(body.get('logoUrl')).toBe('https://cdn.vnz.vn/partners/current.png')
    expect(body.get('websiteUrl')).toBe('https://abc-logistics.vn')
    expect(body.get('description')).toBe('Đối tác vận hành của VNZ.')
    expect(body.get('logo')).toBe(logo)
    expect(body.has('isPublished')).toBe(false)
  })

  it('keeps status operations as a single isPublished field', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'partner-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-05T00:00:00Z',
      },
    })

    await partnerService.updatePartner('partner-id', { isPublished: true })

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect([...body.keys()]).toEqual(['isPublished'])
    expect(body.get('isPublished')).toBe('true')
  })
})
