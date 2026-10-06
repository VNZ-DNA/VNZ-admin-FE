import { useMutation, useQueryClient } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'
import type { UpdateProductRequest } from '@/features/products/types'

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProductRequest) => productService.updateProduct(id, payload),
    onSuccess: async (product) => {
      queryClient.setQueryData(['product', id], product)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
