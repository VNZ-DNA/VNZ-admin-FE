import type { NewsArticleDetail } from '@/features/news/types'
import type { ContentLocale } from '@/lib/content-locale'

export type NewsContentView = Pick<NewsArticleDetail, 'title' | 'summary' | 'content'>

const EMPTY_ENGLISH_CONTENT: NewsContentView = {
  title: null,
  summary: null,
  content: null,
}

export function selectNewsContent(
  article: Pick<NewsArticleDetail, 'title' | 'summary' | 'content' | 'translations'>,
  locale: ContentLocale,
): NewsContentView {
  if (locale === 'vi') {
    return {
      title: article.title,
      summary: article.summary,
      content: article.content,
    }
  }

  const english = article.translations?.en
  if (!english) return EMPTY_ENGLISH_CONTENT

  return {
    title: english.title ?? null,
    summary: english.summary ?? null,
    content: english.content ?? null,
  }
}
