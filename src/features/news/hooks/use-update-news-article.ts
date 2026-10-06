import { useMutation, useQueryClient } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'
import type { UpdateNewsArticleRequest } from '@/features/news/types'

export function useUpdateNewsArticle(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateNewsArticleRequest) => newsService.updateNewsArticle(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['news-articles'] }),
        queryClient.invalidateQueries({ queryKey: ['news-article', id] }),
      ])
    },
  })
}
