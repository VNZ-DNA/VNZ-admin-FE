import { useQuery } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProduct(id),
    enabled: Boolean(id),
  })
}
