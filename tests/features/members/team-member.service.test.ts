import { afterEach, describe, expect, it, vi } from 'vitest'

import { teamMemberService } from '@/features/members/services/team-member.service'
import { api } from '@/lib/http/axios'

afterEach(() => vi.restoreAllMocks())

const profile = {
  displayName: 'TAN',
  fullName: 'Nguyễn Văn A',
  email: 'member@example.com',
  position: 'Backend Developer',
  jobLevel: 'Senior' as const,
  joinedDate: '2026-01-01',
  hometown: null,
  hobbies: null,
  personalQuote: null,
}

describe('Team Member media multipart contract', () => {
  it('sends create animation as a file and does not send animationUrl', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'member-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-07T00:00:00Z',
      },
    })

    const animation = new File(['animation'], 'animation.png', { type: 'image/png' })

    await teamMemberService.createTeamMember({
      ...profile,
      animationUrl: 'https://legacy.example/animation.png',
      animation,
    } as never)

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.get('animation')).toBe(animation)
    expect(body.has('animationUrl')).toBe(false)
  })

  it('sends update animation removal as an action without animationUrl', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'member-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-07T00:00:00Z',
      },
    })

    await teamMemberService.updateTeamMember('member-id', {
      ...profile,
      animationUrl: 'https://legacy.example/animation.png',
      employmentStatus: 'Working',
      animationAction: 'remove',
    } as never)

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect(body.get('animationAction')).toBe('remove')
    expect(body.has('animation')).toBe(false)
    expect(body.has('animationUrl')).toBe(false)
  })

  it('sends create media as files and does not send URL fields', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'member-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-06T00:00:00Z',
      },
    })

    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const audio = new File(['audio'], 'intro.mp3', { type: 'audio/mpeg' })

    await teamMemberService.createTeamMember({
      ...profile,
      avatar,
      audio,
    })

    const body = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(body.get('avatar')).toBe(avatar)
    expect(body.get('audio')).toBe(audio)
    expect(body.has('avatarUrl')).toBe(false)
    expect(body.has('backgroundUrl')).toBe(false)
    expect(body.has('audioUrl')).toBe(false)
  })

  it('sends edit media actions and rejects neither file nor action at the service boundary', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({
      data: {
        isSuccess: true,
        message: 'OK',
        data: { id: 'member-id' },
        errors: null,
        traceId: 'trace-id',
        timestampUtc: '2026-10-06T00:00:00Z',
      },
    })

    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await teamMemberService.updateTeamMember('member-id', {
      ...profile,
      employmentStatus: 'Working',
      avatar,
      backgroundAction: 'remove',
    })

    const body = vi.mocked(api.put).mock.calls[0][1] as FormData
    expect(body.get('avatar')).toBe(avatar)
    expect(body.get('backgroundAction')).toBe('remove')
    expect(body.has('avatarUrl')).toBe(false)
    expect(body.has('backgroundUrl')).toBe(false)
    expect(body.has('audioUrl')).toBe(false)
    expect(body.has('isPublished')).toBe(false)
  })
})
