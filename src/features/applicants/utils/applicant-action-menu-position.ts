export type ApplicantActionMenuRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>

export type ApplicantActionMenuPosition = {
  top: number
  left: number
}

export function getApplicantActionMenuPosition(
  triggerRect: ApplicantActionMenuRect,
  viewport: { width: number; height: number },
): ApplicantActionMenuPosition | null {
  const isOutsideViewport =
    triggerRect.bottom <= 0 ||
    triggerRect.top >= viewport.height ||
    triggerRect.right <= 0 ||
    triggerRect.left >= viewport.width

  if (isOutsideViewport) return null

  const menuWidth = 160
  const menuHeight = 100
  const viewportPadding = 8
  const gap = 5
  const left = Math.max(
    viewportPadding,
    Math.min(triggerRect.right - menuWidth, viewport.width - menuWidth - viewportPadding),
  )
  const opensBelow = triggerRect.bottom + gap + menuHeight <= viewport.height - viewportPadding
  const top = opensBelow
    ? triggerRect.bottom + gap
    : Math.max(viewportPadding, triggerRect.top - gap - menuHeight)

  return { top, left }
}
