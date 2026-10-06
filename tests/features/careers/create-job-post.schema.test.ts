import { describe, expect, it } from 'vitest'

import {
  createBilingualJobPostFormSchema,
  publishBilingualJobPostSchema,
} from '@/features/careers/schemas/create-bilingual-job-post.schema'

const draftValues = {
  title: '',
  expiredDate: '',
  departmentId: '',
  employmentType: '',
  jobLevel: '',
  numberOfPositions: '',
  shortDescription: '',
  description: '',
  requirements: '',
  skills: [{ value: '' }],
  translations: {
    en: {
      title: '',
      shortDescription: '',
      description: '',
      requirements: '',
    },
  },
}

describe('create job post schema', () => {
  it('allows a partial bilingual draft', () => {
    expect(createBilingualJobPostFormSchema.safeParse(draftValues).success).toBe(true)
  })

  it('accepts publish content in both languages without requiring skills', () => {
    const result = publishBilingualJobPostSchema.safeParse({
      ...draftValues,
      title: 'Kỹ sư Backend',
      expiredDate: '2030-12-31',
      departmentId: 'department-id',
      employmentType: 'FullTime',
      jobLevel: 'Junior',
      numberOfPositions: '1',
      shortDescription: 'Xây dựng API cho sản phẩm.',
      description: '<p>Phát triển dịch vụ backend.</p>',
      requirements: '<p>Nắm vững C# và HTTP.</p>',
      translations: {
        en: {
          title: 'Backend Engineer',
          shortDescription: 'Build APIs for our products.',
          description: '<p>Develop backend services.</p>',
          requirements: '<p>Good knowledge of C# and HTTP.</p>',
        },
      },
      skills: [],
    })

    expect(result.success).toBe(true)
  })

  it('rejects publish when an English required field is missing', () => {
    const result = publishBilingualJobPostSchema.safeParse({
      ...draftValues,
      title: 'Kỹ sư Backend',
      expiredDate: '2030-12-31',
      departmentId: 'department-id',
      employmentType: 'FullTime',
      jobLevel: 'Junior',
      numberOfPositions: '1',
      shortDescription: 'Xây dựng API cho sản phẩm.',
      description: '<p>Phát triển dịch vụ backend.</p>',
      requirements: '<p>Nắm vững C# và HTTP.</p>',
      translations: {
        en: {
          title: '',
          shortDescription: 'Build APIs for our products.',
          description: '<p>Develop backend services.</p>',
          requirements: '<p>Good knowledge of C# and HTTP.</p>',
        },
      },
      skills: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'translations.en.title')).toBe(true)
    }
  })
})
