import { useMutation, useQueryClient } from '@tanstack/react-query'

import { newsService } from '@/features/news/services/news.service'

export function useCreateNewsArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: newsService.createNewsArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['news-articles'] })
    },
  })
}
