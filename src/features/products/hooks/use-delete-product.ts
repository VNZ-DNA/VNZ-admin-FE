import { useMutation, useQueryClient } from '@tanstack/react-query'

import { productService } from '@/features/products/services/product.service'

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product', id] }),
        queryClient.invalidateQueries({ queryKey: ['products', 'display-order'] }),
      ])
    },
  })
}
