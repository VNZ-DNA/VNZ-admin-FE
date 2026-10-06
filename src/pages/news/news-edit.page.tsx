import { Navigate, useParams } from 'react-router-dom'

import { EditNewsArticleForm } from '@/features/news/components/edit-news-article-form'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function NewsEditPage() {
  const { id } = useParams()

  if (!id) return <Navigate to={ROUTE_PATHS.NEWS} replace />

  return <EditNewsArticleForm id={id} />
}
