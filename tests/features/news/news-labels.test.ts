import { describe, expect, it } from 'vitest'

import { getNewsCategoryLabel, getNewsStatusLabel } from '@/features/news/utils/news-labels'

describe('News display labels', () => {
  it('maps the status keys and canonical category codes defined in TDD-042', () => {
    expect(['Draft', 'Published', 'Closed'].map(getNewsStatusLabel)).toEqual(['Bản nháp', 'Đã đăng', 'Đã đóng'])
    expect(['PRODUCT', 'RECRUITMENT', 'PERSPECTIVE'].map(getNewsCategoryLabel)).toEqual(['Sản phẩm', 'Tuyển dụng', 'Góc nhìn'])
  })

  it('preserves legacy labels and unknown codes without inventing a mapping', () => {
    expect(getNewsStatusLabel('Đã đăng')).toBe('Đã đăng')
    expect(getNewsCategoryLabel('Sản phẩm')).toBe('Sản phẩm')
    expect(getNewsCategoryLabel('OTHER_CATEGORY')).toBe('OTHER_CATEGORY')
  })
})
