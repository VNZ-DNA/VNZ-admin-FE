type OrderableContentBlock = {
  id: string
  order: number
}

export function reorderProductContentBlocks<T extends OrderableContentBlock>(
  blocks: T[],
  sourceId: string,
  targetId: string,
): T[] {
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId)
  const targetIndex = blocks.findIndex((block) => block.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceId === targetId) {
    return blocks
  }

  const nextBlocks = [...blocks]
  const [movedBlock] = nextBlocks.splice(sourceIndex, 1)
  nextBlocks.splice(targetIndex, 0, movedBlock)

  return nextBlocks.map((block, index) => ({ ...block, order: index + 1 }))
}
