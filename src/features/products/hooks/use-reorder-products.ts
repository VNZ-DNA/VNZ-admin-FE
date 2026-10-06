import { useMutation, useQueryClient } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'
import type { ReorderProductsRequest } from '@/features/products/types'

export function useReorderProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReorderProductsRequest) => productService.reorderProducts(payload),
    onSuccess: async (products) => {
      queryClient.setQueryData(['products', 'display-order'], products)
      await queryClient.invalidateQueries({ queryKey: ['products', 'table'] })
    },
  })
}
