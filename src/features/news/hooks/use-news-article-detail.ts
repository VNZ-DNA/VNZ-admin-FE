import { useQuery } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'

export function useNewsArticleDetail(id: string) {
  return useQuery({
    queryKey: ['news-article', id],
    queryFn: () => newsService.getNewsArticleDetail(id),
    enabled: Boolean(id),
  })
}
