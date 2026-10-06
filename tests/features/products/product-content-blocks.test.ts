import { describe, expect, it } from 'vitest'

import { reorderProductContentBlocks } from '@/features/products/product-content-blocks'

describe('reorderProductContentBlocks', () => {
  it('moves a block by id and rewrites consecutive order values', () => {
    const blocks = [
      { id: 'title', order: 1 },
      { id: 'description', order: 2 },
      { id: 'feature', order: 3 },
    ]

    expect(reorderProductContentBlocks(blocks, 'title', 'feature')).toEqual([
      { id: 'description', order: 1 },
      { id: 'feature', order: 2 },
      { id: 'title', order: 3 },
    ])
  })
})
