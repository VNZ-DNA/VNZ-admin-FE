export type ProductMediaAction = 'remove'

export type ProductMediaSlotState = {
  currentUrl: string | null
  file?: File
  removed: boolean
}

export type ProductMediaDraft = {
  logo: ProductMediaSlotState
  wordmark: ProductMediaSlotState
}

export type ProductMediaMutation = {
  logo?: File
  wordmark?: File
  logoAction?: ProductMediaAction
  wordmarkAction?: ProductMediaAction
}

export function createProductMediaDraft(
  logoUrl: string | null = null,
  wordmarkUrl: string | null = null,
): ProductMediaDraft {
  return {
    logo: { currentUrl: logoUrl, removed: false },
    wordmark: { currentUrl: wordmarkUrl, removed: false },
  }
}

export function setProductMediaFile(
  draft: ProductMediaDraft,
  kind: keyof ProductMediaDraft,
  file: File,
): ProductMediaDraft {
  return {
    ...draft,
    [kind]: {
      ...draft[kind],
      file,
      removed: false,
    },
  }
}

export function removeProductMedia(
  draft: ProductMediaDraft,
  kind: keyof ProductMediaDraft,
): ProductMediaDraft {
  const slot = draft[kind]

  return {
    ...draft,
    [kind]: {
      ...slot,
      file: undefined,
      removed: Boolean(slot.currentUrl),
    },
  }
}

export function hasFinalProductMedia(slot: ProductMediaSlotState): boolean {
  if (slot.file) return true
  return Boolean(slot.currentUrl && !slot.removed)
}

export function buildProductMediaMutation(draft: ProductMediaDraft): ProductMediaMutation {
  return {
    ...(draft.logo.file ? { logo: draft.logo.file } : {}),
    ...(draft.wordmark.file ? { wordmark: draft.wordmark.file } : {}),
    ...(!draft.logo.file && draft.logo.removed ? { logoAction: 'remove' as const } : {}),
    ...(!draft.wordmark.file && draft.wordmark.removed ? { wordmarkAction: 'remove' as const } : {}),
  }
}

export function isProductMediaDirty(draft: ProductMediaDraft): boolean {
  return Boolean(
    draft.logo.file ||
      draft.logo.removed ||
      draft.wordmark.file ||
      draft.wordmark.removed,
  )
}
