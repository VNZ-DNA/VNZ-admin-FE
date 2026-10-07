import type { TeamMemberMediaAction } from '@/features/members/types'

export type TeamMemberMediaKind = 'avatar' | 'animation' | 'background' | 'audio'

export type TeamMemberMediaSlot = {
  currentUrl: string | null
  file?: File
  removed: boolean
}

export type TeamMemberMediaDraft = Record<TeamMemberMediaKind, TeamMemberMediaSlot>

export type TeamMemberMediaMutation = {
  avatar?: File
  avatarAction?: TeamMemberMediaAction
  animation?: File
  animationAction?: TeamMemberMediaAction
  background?: File
  backgroundAction?: TeamMemberMediaAction
  audio?: File
  audioAction?: TeamMemberMediaAction
}

type InitialMediaUrls = Partial<Record<TeamMemberMediaKind, string | null>>

export function createTeamMemberMediaDraft(urls: InitialMediaUrls = {}): TeamMemberMediaDraft {
  return {
    avatar: { currentUrl: urls.avatar ?? null, removed: false },
    animation: { currentUrl: urls.animation ?? null, removed: false },
    background: { currentUrl: urls.background ?? null, removed: false },
    audio: { currentUrl: urls.audio ?? null, removed: false },
  }
}

export function setTeamMemberMediaFile(
  draft: TeamMemberMediaDraft,
  kind: TeamMemberMediaKind,
  file: File,
): TeamMemberMediaDraft {
  return {
    ...draft,
    [kind]: { ...draft[kind], file, removed: false },
  }
}

export function removeTeamMemberMedia(
  draft: TeamMemberMediaDraft,
  kind: TeamMemberMediaKind,
): TeamMemberMediaDraft {
  const slot = draft[kind]

  return {
    ...draft,
    [kind]: {
      currentUrl: slot.currentUrl,
      file: undefined,
      removed: Boolean(slot.currentUrl),
    },
  }
}

export function isTeamMemberMediaDirty(draft: TeamMemberMediaDraft): boolean {
  return Object.values(draft).some((slot) => Boolean(slot.file) || slot.removed)
}

export function buildTeamMemberMediaMutation(
  draft: TeamMemberMediaDraft,
  includeActions = true,
): TeamMemberMediaMutation {
  const mutation: TeamMemberMediaMutation = {}

  for (const kind of ['avatar', 'animation', 'background', 'audio'] as const) {
    const slot = draft[kind]
    if (slot.file) {
      mutation[kind] = slot.file
    } else if (includeActions && slot.removed) {
      mutation[`${kind}Action`] = 'remove'
    }
  }

  return mutation
}

export function buildTeamMemberMediaFiles(
  draft: TeamMemberMediaDraft,
): Partial<Record<TeamMemberMediaKind, File>> {
  const files: Partial<Record<TeamMemberMediaKind, File>> = {}

  for (const kind of ['avatar', 'animation', 'background', 'audio'] as const) {
    const file = draft[kind].file
    if (file) files[kind] = file
  }

  return files
}
