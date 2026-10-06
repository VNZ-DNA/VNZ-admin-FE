import { Navigate, useParams } from 'react-router-dom'

import { NewsArticleDetail } from '@/features/news/components/news-article-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to={ROUTE_PATHS.NEWS} replace />
  }

  return <NewsArticleDetail id={id} />
}
