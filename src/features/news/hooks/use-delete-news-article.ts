import { useMutation, useQueryClient } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'

export function useDeleteNewsArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => newsService.deleteNewsArticle(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['news-articles'] }),
        queryClient.invalidateQueries({ queryKey: ['news-article', id] }),
      ])
    },
  })
}
