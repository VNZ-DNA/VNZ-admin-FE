import type { ContentLocale } from '@/lib/content-locale'
import type { JobPostDetail } from '@/features/careers/types'

export interface JobPostContentView {
  title: string | null
  shortDescription: string | null
  description: string | null
  requirements: string | null
}

const EMPTY_ENGLISH_CONTENT: JobPostContentView = {
  title: null,
  shortDescription: null,
  description: null,
  requirements: null,
}

export function selectJobPostContent(
  jobPost: Pick<JobPostDetail, 'title' | 'shortDescription' | 'description' | 'requirements' | 'translations'>,
  locale: ContentLocale,
): JobPostContentView {
  if (locale === 'vi') {
    return {
      title: jobPost.title,
      shortDescription: jobPost.shortDescription,
      description: jobPost.description,
      requirements: jobPost.requirements,
    }
  }

  const english = jobPost.translations?.en
  if (!english) return EMPTY_ENGLISH_CONTENT

  return {
    title: english.title ?? null,
    shortDescription: english.shortDescription ?? null,
    description: english.description ?? null,
    requirements: english.requirements ?? null,
  }
}
