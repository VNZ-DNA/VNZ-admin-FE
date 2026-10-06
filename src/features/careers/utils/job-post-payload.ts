import type { CreateBilingualJobPostFormValues as CreateJobPostFormValues } from '@/features/careers/schemas/create-bilingual-job-post.schema'
import type {
  CreateJobPostRequest,
  JobPostCreateAction,
  JobPostEmploymentType,
  JobPostLevel,
} from '@/features/careers/types'
import { nullableRichText } from '@/features/news/utils/rich-text'

function nullableText(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}

export function buildCreateJobPostPayload(
  values: CreateJobPostFormValues,
  action: JobPostCreateAction,
): CreateJobPostRequest {
  return {
    title: nullableText(values.title),
    departmentId: values.departmentId || null,
    employmentType: values.employmentType
      ? (values.employmentType as JobPostEmploymentType)
      : null,
    jobLevel: values.jobLevel ? (values.jobLevel as JobPostLevel) : null,
    numberOfPositions: values.numberOfPositions.trim() ? Number(values.numberOfPositions) : null,
    skills: values.skills.map((skill) => skill.value.trim()).filter(Boolean),
    shortDescription: nullableText(values.shortDescription),
    description: nullableRichText(values.description),
    requirements: nullableRichText(values.requirements),
    expiredDate: values.expiredDate || null,
    action,
    translations: {
      en: {
        title: nullableText(values.translations.en.title),
        shortDescription: nullableText(values.translations.en.shortDescription),
        description: nullableRichText(values.translations.en.description),
        requirements: nullableRichText(values.translations.en.requirements),
      },
    },
  }
}
