import { describe, expect, it } from 'vitest'

import { selectProductContent } from '@/features/products/utils/product-content-locale'
import { getProductContentErrorLocales } from '@/features/products/utils/product-content-form'
import type { ProductContent } from '@/features/products/types'

const vietnamese: ProductContent = {
  blocks: [{ id: 'vi-title', type: 'Title', order: 1, text: '<p>Tiêu đề VI</p>', items: null }],
}

const english: ProductContent = {
  blocks: [{ id: 'en-title', type: 'Title', order: 1, text: '<p>English title</p>', items: null }],
}

describe('selectProductContent', () => {
  it('returns source Vietnamese content for the VI tab', () => {
    expect(selectProductContent({ content: vietnamese, translations: { en: { content: english } } }, 'vi'))
      .toBe(vietnamese)
  })

  it('returns the stored English content for the EN tab', () => {
    expect(selectProductContent({ content: vietnamese, translations: { en: { content: english } } }, 'en'))
      .toBe(english)
  })

  it('does not fall back to Vietnamese when English content is missing', () => {
    expect(selectProductContent({ content: vietnamese, translations: null }, 'en')).toBeNull()
    expect(selectProductContent({ content: vietnamese, translations: { en: { content: null } } }, 'en')).toBeNull()
  })
})

describe('getProductContentErrorLocales', () => {
  it('marks every locale represented by normalized backend field paths', () => {
    expect(
      getProductContentErrorLocales([
        'translations.en.content.blocks[0].text',
        'content.blocks[1].items[0].title',
      ]),
    ).toEqual(['en', 'vi'])
  })
})
