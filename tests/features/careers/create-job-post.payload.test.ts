import { describe, expect, it } from 'vitest'

import { buildCreateJobPostPayload } from '@/features/careers/utils/job-post-payload'
import type { CreateBilingualJobPostFormValues as CreateJobPostFormValues } from '@/features/careers/schemas/create-bilingual-job-post.schema'

const values: CreateJobPostFormValues = {
  title: '  Kỹ sư Backend  ',
  expiredDate: '2030-12-31',
  departmentId: 'department-id',
  employmentType: 'FullTime',
  jobLevel: 'Junior',
  numberOfPositions: '2',
  shortDescription: ' Mô tả ngắn ',
  description: '<p>Mô tả công việc</p>',
  requirements: '<p>Yêu cầu ứng viên</p>',
  skills: [{ value: ' C# ' }, { value: ' ' }],
  translations: {
    en: {
      title: '  Backend Engineer  ',
      shortDescription: ' English summary ',
      description: '<p>English description</p>',
      requirements: '<p>English requirements</p>',
    },
  },
}

describe('buildCreateJobPostPayload', () => {
  it('keeps both rich-text locales and normalizes metadata and skills', () => {
    expect(buildCreateJobPostPayload(values, 'Publish')).toEqual({
      title: 'Kỹ sư Backend',
      departmentId: 'department-id',
      employmentType: 'FullTime',
      jobLevel: 'Junior',
      numberOfPositions: 2,
      skills: ['C#'],
      shortDescription: 'Mô tả ngắn',
      description: '<p>Mô tả công việc</p>',
      requirements: '<p>Yêu cầu ứng viên</p>',
      expiredDate: '2030-12-31',
      action: 'Publish',
      translations: {
        en: {
          title: 'Backend Engineer',
          shortDescription: 'English summary',
          description: '<p>English description</p>',
          requirements: '<p>English requirements</p>',
        },
      },
    })
  })

  it('sends null for empty draft content and keeps an empty skills array valid', () => {
    expect(buildCreateJobPostPayload({
      ...values,
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
    }, 'SavedDraft')).toEqual({
      title: null,
      departmentId: null,
      employmentType: null,
      jobLevel: null,
      numberOfPositions: null,
      skills: [],
      shortDescription: null,
      description: null,
      requirements: null,
      expiredDate: null,
      action: 'SavedDraft',
      translations: {
        en: {
          title: null,
          shortDescription: null,
          description: null,
          requirements: null,
        },
      },
    })
  })
})
