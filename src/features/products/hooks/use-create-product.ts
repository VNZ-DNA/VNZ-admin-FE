import { useMutation, useQueryClient } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'
import type { CreateProductRequest } from '@/features/products/types'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProductRequest) => productService.createProduct(payload),
    onSuccess: async (product) => {
      queryClient.setQueryData(['product', product.id], product)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}