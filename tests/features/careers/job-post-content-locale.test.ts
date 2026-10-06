import { describe, expect, it } from 'vitest'

import { selectJobPostContent } from '@/features/careers/utils/job-post-content-locale'

describe('selectJobPostContent', () => {
  it('returns English content when the English tab is selected', () => {
    const content = selectJobPostContent(
      {
        title: 'Kỹ sư Backend',
        shortDescription: 'Mô tả tiếng Việt',
        description: '<p>Mô tả công việc tiếng Việt</p>',
        requirements: '<p>Yêu cầu tiếng Việt</p>',
        translations: {
          en: {
            title: 'Backend Engineer',
            shortDescription: 'English summary',
            description: '<p>English description</p>',
            requirements: '<p>English requirements</p>',
          },
        },
      },
      'en',
    )

    expect(content).toEqual({
      title: 'Backend Engineer',
      shortDescription: 'English summary',
      description: '<p>English description</p>',
      requirements: '<p>English requirements</p>',
    })
  })

  it('does not fall back to Vietnamese when the English translation is missing', () => {
    const content = selectJobPostContent(
      {
        title: 'Kỹ sư Backend',
        shortDescription: 'Mô tả tiếng Việt',
        description: '<p>Mô tả công việc tiếng Việt</p>',
        requirements: '<p>Yêu cầu tiếng Việt</p>',
        translations: null,
      },
      'en',
    )

    expect(content).toEqual({
      title: null,
      shortDescription: null,
      description: null,
      requirements: null,
    })
  })
})
