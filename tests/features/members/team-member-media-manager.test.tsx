import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TeamMemberMediaManager } from '@/features/members/components/team-member-media-manager'
import { createTeamMemberMediaDraft, type TeamMemberMediaDraft } from '@/features/members/member-media'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TeamMemberMediaManager Animation contract', () => {
  it('renders Animation as a managed media slot and marks an existing file for removal', () => {
    const onChange = vi.fn()
    const value = {
      ...createTeamMemberMediaDraft(),
      animation: { currentUrl: 'https://cdn.vnz.vn/animation.png', removed: false },
    } as unknown as TeamMemberMediaDraft

    render(<TeamMemberMediaManager value={value} onChange={onChange} />)

    expect(screen.getByLabelText('Tên file Animation')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ Animation' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      animation: expect.objectContaining({ removed: true }),
    }))
  })
})
