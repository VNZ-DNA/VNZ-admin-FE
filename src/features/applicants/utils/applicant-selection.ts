type SelectableApplicant = {
  id: string
  canSelectForInterviewEmail?: boolean
}

export type ApplicantPageSelectionState = {
  isAllSelected: boolean
  isIndeterminate: boolean
}

export function getPageSelectionState(
  items: SelectableApplicant[],
  selectedIds: ReadonlySet<string>,
): ApplicantPageSelectionState {
  const eligibleItems = items.filter((item) => item.canSelectForInterviewEmail === true)
  const selectedCount = eligibleItems.filter((item) => selectedIds.has(item.id)).length

  return {
    isAllSelected: eligibleItems.length > 0 && selectedCount === eligibleItems.length,
    isIndeterminate: selectedCount > 0 && selectedCount < eligibleItems.length,
  }
}

export function updatePageSelection(
  selectedIds: ReadonlySet<string>,
  items: SelectableApplicant[],
  isSelected: boolean,
): Set<string> {
  const nextIds = new Set(selectedIds)

  for (const item of items) {
    if (isSelected && item.canSelectForInterviewEmail === true) {
      nextIds.add(item.id)
    } else {
      nextIds.delete(item.id)
    }
  }

  return nextIds
}
