import { describe, expect, it } from 'vitest'

import {
  buildTeamMemberMediaMutation,
  createTeamMemberMediaDraft,
  isTeamMemberMediaDirty,
  removeTeamMemberMedia,
  setTeamMemberMediaFile,
} from '@/features/members/member-media'

describe('Team Member media draft', () => {
  it('builds a file replacement without sending the old URL', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const draft = setTeamMemberMediaFile(
      createTeamMemberMediaDraft({ avatar: 'https://cdn.vnz.vn/avatar.png' }),
      'avatar',
      file,
    )

    expect(draft.avatar.file).toBe(file)
    expect(draft.avatar.removed).toBe(false)
    expect(buildTeamMemberMediaMutation(draft)).toEqual({ avatar: file })
    expect(isTeamMemberMediaDirty(draft)).toBe(true)
  })

  it('builds a remove action for an existing media reference', () => {
    const draft = removeTeamMemberMedia(
      createTeamMemberMediaDraft({ background: 'https://cdn.vnz.vn/background.png' }),
      'background',
    )

    expect(draft.background.removed).toBe(true)
    expect(buildTeamMemberMediaMutation(draft)).toEqual({ backgroundAction: 'remove' })
    expect(isTeamMemberMediaDirty(draft)).toBe(true)
  })

  it('clears a newly selected file without creating a remove action', () => {
    const file = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' })
    const selected = setTeamMemberMediaFile(createTeamMemberMediaDraft(), 'audio', file)
    const cleared = removeTeamMemberMedia(selected, 'audio')

    expect(cleared.audio.file).toBeUndefined()
    expect(cleared.audio.removed).toBe(false)
    expect(buildTeamMemberMediaMutation(cleared)).toEqual({})
    expect(isTeamMemberMediaDirty(cleared)).toBe(false)
  })
})
