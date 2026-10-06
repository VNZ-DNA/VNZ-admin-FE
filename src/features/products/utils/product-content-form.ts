import { nullableRichText } from '@/features/news/utils/rich-text'
import { sanitizeProductRichText } from '@/features/products/product-rich-text'
import type {
  ProductContent,
  ProductContentBlock,
  ProductContentBlockType,
  ProductDetail,
  ProductFeatureItem,
} from '@/features/products/types'
import type { ContentLocale } from '@/lib/content-locale'

export type ProductEditorBlock = {
  id: string
  type: ProductContentBlockType
  order: number
  text: string
  items: ProductFeatureItem[]
}

export type LocalizedProductBlocks = Record<ContentLocale, ProductEditorBlock[]>

export function getProductContentErrorLocales(fields: readonly string[]): ContentLocale[] {
  const locales = new Set<ContentLocale>()

  fields.forEach((field) => {
    if (field.startsWith('translations.en')) locales.add('en')
    if (field.startsWith('content')) locales.add('vi')
  })

  return [...locales]
}

function createBlock(type: ProductContentBlockType, order: number): ProductEditorBlock {
  return {
    id: crypto.randomUUID(),
    type,
    order,
    text: '',
    items: type === 'Feature' ? [{ id: crypto.randomUUID(), title: '' }] : [],
  }
}

export function createDefaultProductBlocks(): ProductEditorBlock[] {
  return (['Title', 'Description', 'Category', 'Feature'] as const).map((type, index) =>
    createBlock(type, index + 1),
  )
}

function toEditorBlock(block: ProductContentBlock): ProductEditorBlock {
  return {
    id: block.id,
    type: block.type,
    order: block.order,
    text: block.text ?? '',
    items: block.items?.map((item) => ({ ...item })) ?? [],
  }
}

function emptyLocalizedBlock(block: ProductEditorBlock): ProductEditorBlock {
  return {
    ...block,
    text: '',
    items: block.type === 'Feature' ? block.items.map((item) => ({ ...item, title: '' })) : [],
  }
}

export function createLocalizedProductBlocks(product?: Pick<ProductDetail, 'content' | 'translations'>): LocalizedProductBlocks {
  const viBlocks = product?.content?.blocks
    ?.slice()
    .sort((first, second) => first.order - second.order)
    .map(toEditorBlock)
  const enBlocks = product?.translations?.en?.content?.blocks
    ?.slice()
    .sort((first, second) => first.order - second.order)
    .map(toEditorBlock)

  const baseBlocks = viBlocks && viBlocks.length > 0
    ? viBlocks
    : enBlocks && enBlocks.length > 0
      ? enBlocks.map(emptyLocalizedBlock)
      : createDefaultProductBlocks()
  const viById = new Map((viBlocks ?? []).map((block) => [block.id, block]))
  const englishById = new Map((enBlocks ?? []).map((block) => [block.id, block]))

  return {
    vi: baseBlocks.map((block) => viById.get(block.id) ?? emptyLocalizedBlock(block)),
    en: baseBlocks.map((block) => englishById.get(block.id) ?? emptyLocalizedBlock(block)),
  }
}

export function buildProductContent(blocks: ProductEditorBlock[]): ProductContent | null {
  const nextBlocks: ProductContentBlock[] = []

  blocks.forEach((block) => {
    if (block.type === 'Feature') {
      const items = block.items
        .map((item) => ({ id: item.id, title: item.title.trim() }))
        .filter((item) => item.title)
      if (items.length === 0) return

      nextBlocks.push({ id: block.id, type: block.type, order: nextBlocks.length + 1, text: null, items })
      return
    }

    const text = nullableRichText(sanitizeProductRichText(block.text))
    if (!text) return

    nextBlocks.push({ id: block.id, type: block.type, order: nextBlocks.length + 1, text, items: null })
  })

  return nextBlocks.length > 0 ? { blocks: nextBlocks } : null
}

export function buildBilingualProductContent(blocks: LocalizedProductBlocks) {
  return {
    content: buildProductContent(blocks.vi),
    translations: { en: { content: buildProductContent(blocks.en) } },
  }
}
