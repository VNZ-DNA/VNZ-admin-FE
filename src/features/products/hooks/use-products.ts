import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'
import type { GetProductsParams } from '@/features/products/types'

export function useProducts(params: GetProductsParams) {
  return useQuery({
    queryKey: ['products', 'table', params],
    queryFn: () => productService.getProducts(params),
    placeholderData: keepPreviousData,
  })
}
