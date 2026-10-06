import { Navigate, useParams } from 'react-router-dom'

import { ProductDetail } from '@/features/products/components/product-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to={ROUTE_PATHS.PRODUCTS} replace />
  }

  return <ProductDetail id={id} />
}
