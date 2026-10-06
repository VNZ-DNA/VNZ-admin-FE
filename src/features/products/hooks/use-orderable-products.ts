import { useQuery } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'

export function useOrderableProducts(enabled = true) {
  return useQuery({
    queryKey: ['products', 'display-order'],
    queryFn: productService.getOrderableProducts,
    enabled,
  })
}
