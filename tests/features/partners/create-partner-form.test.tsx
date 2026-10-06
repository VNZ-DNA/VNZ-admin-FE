import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CreatePartnerForm } from '@/features/partners/components/create-partner-form'
import { partnerService } from '@/features/partners/services/partner.service'
import type { PartnerDetail } from '@/features/partners/types'

const createdPartner: PartnerDetail = {
  id: 'partner-id',
  name: 'ABC Logistics',
  logoUrl: 'https://cdn.vnz.vn/partners/abc.png',
  websiteUrl: 'https://abc-logistics.vn',
  description: 'Đối tác vận hành của VNZ.',
  isPublished: false,
  displayOrder: null,
  createdBy: 'admin-id',
  createdAt: '2026-10-05T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
}

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
        <CreatePartnerForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreatePartnerForm logo upload flow', () => {
  it('sends a selected logo file in the create payload', async () => {
    const create = vi.spyOn(partnerService, 'createPartner').mockResolvedValue(createdPartner)
    renderCreate()

    fireEvent.change(screen.getByPlaceholderText('Nhập tên đối tác'), {
      target: { value: 'ABC Logistics' },
    })

    const logo = new File(['logo'], 'logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Logo đối tác'), { target: { files: [logo] } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đối tác' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ logo }))
  })
})
