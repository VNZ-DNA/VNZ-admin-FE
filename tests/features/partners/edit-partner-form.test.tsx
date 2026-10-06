import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditPartnerForm } from '@/features/partners/components/edit-partner-form'
import { partnerService } from '@/features/partners/services/partner.service'
import type { PartnerDetail } from '@/features/partners/types'

const partner: PartnerDetail = {
  id: 'partner-id',
  name: 'ABC Logistics',
  logoUrl: 'https://cdn.vnz.vn/partners/abc.png',
  websiteUrl: 'https://abc-logistics.vn',
  description: 'Đối tác vận hành của VNZ.',
  isPublished: false,
  displayOrder: null,
  createdBy: 'admin-id',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderEdit(currentPartner: PartnerDetail = partner) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  vi.spyOn(partnerService, 'getPartner').mockResolvedValue(currentPartner)

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EditPartnerForm id={currentPartner.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EditPartnerForm TDD-038 flow', () => {
  it('saves profile fields without sending isPublished', async () => {
    const update = vi.spyOn(partnerService, 'updatePartner').mockResolvedValue(partner)
    renderEdit()

    const name = await screen.findByDisplayValue('ABC Logistics')
    fireEvent.change(name, { target: { value: 'ABC Logistics Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(partner.id, {
      name: 'ABC Logistics Updated',
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      description: partner.description,
    })
  })

  it('publishes with only isPublished=true when the profile is clean', async () => {
    const update = vi.spyOn(partnerService, 'updatePartner').mockResolvedValue({ ...partner, isPublished: true, displayOrder: 3 })
    renderEdit()

    await screen.findByDisplayValue('ABC Logistics')
    fireEvent.click(screen.getByRole('button', { name: 'Đăng' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith(partner.id, { isPublished: true }))
  })

  it('blocks publishing while profile changes are unsaved', async () => {
    const update = vi.spyOn(partnerService, 'updatePartner').mockResolvedValue({ ...partner, isPublished: true })
    renderEdit()

    const name = await screen.findByDisplayValue('ABC Logistics')
    fireEvent.change(name, { target: { value: 'ABC Logistics Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng' }))

    expect(update).not.toHaveBeenCalled()
    expect(screen.getByText('Thông tin chỉnh sửa chưa được lưu. Vui lòng lưu trước khi đăng.')).toBeTruthy()
  })

  it('confirms unpublish and sends only isPublished=false', async () => {
    const publishedPartner = { ...partner, isPublished: true, displayOrder: 2 }
    const update = vi.spyOn(partnerService, 'updatePartner').mockResolvedValue({ ...publishedPartner, isPublished: false, displayOrder: null })
    renderEdit(publishedPartner)

    await screen.findByDisplayValue('ABC Logistics')
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ đăng' }))

    expect(screen.getByRole('heading', { name: 'Gỡ đăng đối tác?' })).toBeTruthy()
    expect(update).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(partner.id, { isPublished: false }))
  })

  it('uploads a selected logo as part of the profile save', async () => {
    const update = vi.spyOn(partnerService, 'updatePartner').mockResolvedValue(partner)
    renderEdit()

    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const input = await screen.findByLabelText('Logo đối tác')
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update).toHaveBeenCalledWith(partner.id, expect.objectContaining({ logo: file }))
  })
})
