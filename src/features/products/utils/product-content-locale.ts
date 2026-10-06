import type { ProductContent, ProductDetail } from '@/features/products/types'
import type { ContentLocale } from '@/lib/content-locale'

export type ProductContentSource = Pick<ProductDetail, 'content' | 'translations'>

export function selectProductContent(
  product: ProductContentSource,
  locale: ContentLocale,
): ProductContent | null {
  if (locale === 'vi') {
    return product.content
  }

  return product.translations?.en?.content ?? null
}
