import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'
import type { GetNewsArticlesParams } from '@/features/news/types'

export function useNewsArticles(params: GetNewsArticlesParams) {
  return useQuery({
    queryKey: ['news-articles', params],
    queryFn: () => newsService.getNewsArticles(params),
    placeholderData: keepPreviousData,
  })
}
