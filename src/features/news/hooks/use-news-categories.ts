import { useQuery } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'

export function useNewsCategories() {
  return useQuery({
    queryKey: ['news-categories'],
    queryFn: newsService.getNewsCategories,
  })
}
