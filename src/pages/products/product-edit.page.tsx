import { Navigate, useParams } from 'react-router-dom'

import { EditProductForm } from '@/features/products/components/edit-product-form'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to={ROUTE_PATHS.PRODUCTS} replace />
  }

  return <EditProductForm id={id} />
}
