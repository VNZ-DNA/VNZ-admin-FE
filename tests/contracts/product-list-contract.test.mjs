import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const componentPath = fileURLToPath(
  new URL('../../src/features/products/components/product-list.tsx', import.meta.url),
)
const componentSource = readFileSync(componentPath, 'utf8')
const stylesPath = fileURLToPath(new URL('../../src/styles/products.css', import.meta.url))
const styles = readFileSync(stylesPath, 'utf8')
const serviceSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/services/product.service.ts', import.meta.url)),
  'utf8',
)
const typesSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/types.ts', import.meta.url)),
  'utf8',
)
const detailSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/product-detail.tsx', import.meta.url)),
  'utf8',
)
const editSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/edit-product-form.tsx', import.meta.url)),
  'utf8',
)

test('product rows do not navigate directly and expose detail and edit from row actions', () => {
  const row = componentSource.match(/<div\s+className="product-list__row"[^>]*>/s)?.[0]

  assert.ok(row, 'product row markup exists')
  assert.doesNotMatch(row, /tabIndex=|onClick=|onKeyDown=/)
  assert.match(componentSource, /aria-haspopup="menu"/)
  assert.match(componentSource, /Xem chi tiết/)
  assert.match(componentSource, /Chỉnh sửa/)
  assert.match(componentSource, /role="menuitem"[^>]*>\s*[\s\S]*?Xóa/)
  assert.match(componentSource, /canDelete/)
  assert.match(componentSource, /deleteBlockedReason/)
  assert.match(componentSource, /PRODUCT_DETAIL\.replace\(':id', productId\)/)
  assert.match(componentSource, /PRODUCT_EDIT\.replace\(':id', productId\)/)
})

test('product soft delete follows the TDD endpoint and exposes the public guard contract', () => {
  assert.match(typesSource, /canDelete\?: boolean/)
  assert.match(typesSource, /deleteBlockedReason\?: string \| null/)
  assert.match(serviceSource, /async deleteProduct\(id: string\)/)
  assert.match(serviceSource, /api\.delete<ApiResponse<DeleteProductResult>>\(`\/api\/v1\/admin\/products\/\$\{id\}`\)/)
  assert.match(detailSource, /product-detail__action--delete/)
  assert.match(detailSource, /deleteBlockedReason/)
})

test('product detail uses the news detail frame and requested sequential asset fields', () => {
  assert.doesNotMatch(detailSource, /product-detail__page-header/)
  assert.match(detailSource, /product-detail__toolbar/)
  assert.doesNotMatch(detailSource, /ProductMediaPair/)
  assert.doesNotMatch(detailSource, /<dt>Name<\/dt>/)
  assert.match(detailSource, /product-detail__asset-field/)
  assert.match(detailSource, /product-detail__asset-preview/)
  assert.match(detailSource, /product-detail__info-field/)
  assert.match(detailSource, /product-detail__detail-columns/)
  assert.match(detailSource, /product-detail__assets-column/)
  assert.match(styles, /\.product-detail \{\s*min-width: 0;\s*min-height: 100%;\s*padding: 24px 28px 32px;/s)
  assert.match(styles, /\.product-detail__breadcrumb \{\s*gap: 5px;\s*margin-bottom: 12px;/s)
  assert.match(styles, /\.product-detail__toolbar \{\s*display: flex;\s*align-items: center;\s*justify-content: flex-end;\s*gap: 8px;/s)
  assert.match(styles, /\.product-detail__detail-columns \{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)[^}]*align-items:\s*start;/s)
  assert.match(styles, /\.product-detail__detail-columns \.product-detail__content-section > h2 \{[^}]*margin:\s*0 0 14px;[^}]*color:\s*#475569;[^}]*font-size:\s*11px;[^}]*font-weight:\s*750;[^}]*text-transform:\s*none;/s)
  assert.match(styles, /\.product-detail__detail-columns \.product-detail__assets-column \{[^}]*padding-top:\s*0;/s)
  assert.match(styles, /\.product-detail__sheet \.product-detail__info-list > div:first-child \{\s*padding-top:\s*0;/s)
  assert.match(styles, /\.product-detail__sheet \.product-detail__info-field dt \{[^}]*color:\s*#475569;[^}]*font-size:\s*11px;[^}]*font-weight:\s*750;[^}]*line-height:\s*1\.2;[^}]*text-transform:\s*none;/s)
  assert.match(styles, /\.product-detail__sheet \.product-detail__info-field \{[^}]*align-items:\s*baseline;/s)
})

test('product detail stacks the publication status below the progress status', () => {
  assert.match(detailSource, /product-detail__status-stack/)
  assert.match(detailSource, /product\.isPublished \? 'published' : 'unpublished'/)
  assert.match(detailSource, /product\.isPublished \? 'Đã đăng' : 'Chưa đăng'/)
  assert.match(styles, /\.product-detail__status-stack \{[^}]*flex-direction: column;[^}]*gap: 8px;/s)
  assert.match(styles, /\.product-detail__status--published \{[^}]*background: #e6f8ef;[^}]*color: #21865b;/s)
  assert.match(styles, /\.product-detail__status--unpublished \{[^}]*background: #f5f7fa;[^}]*color: #64748b;/s)
})

test('product pagination supports news page sizes and first/last page navigation', () => {
  assert.match(componentSource, /PAGE_SIZE_OPTIONS\s*=\s*\[10,\s*20,\s*50\]/)
  assert.match(componentSource, /onPageSizeChange=\{\(nextPageSize\) => \{[\s\S]*?setPageSize\(nextPageSize\)[\s\S]*?setPage\(1\)/)
  assert.match(componentSource, /aria-label="Trang đầu"/)
  assert.match(componentSource, /aria-label="Trang cuối"/)
  assert.doesNotMatch(componentSource, /\$\{startItem\}–\$\{endItem\} \/ \$\{data\.total\}/)
})

test('product filters send repeated statuses and preserve an unpublished filter', () => {
  assert.match(typesSource, /status\?: ProductStatus\[\]/)
  assert.match(typesSource, /isPublished\?: boolean/)
  assert.match(serviceSource, /for \(const status of params\.status \?\? \[\]\) query\.append\('status', status\)/)
  assert.match(
    serviceSource,
    /if \(params\.isPublished !== undefined\) query\.set\('isPublished', String\(params\.isPublished\)\)/,
  )
  assert.match(serviceSource, /params: query/)
  assert.match(componentSource, /aria-multiselectable="true"/)
  assert.match(componentSource, /: 'Tiến độ'/)
  assert.match(componentSource, /<option value="">Trạng thái đăng<\/option>/)
  assert.match(componentSource, /setStatuses\(nextStatuses\)[\s\S]*?setPage\(1\)/)
  assert.match(componentSource, /setIsPublished\(nextIsPublished\)[\s\S]*?setPage\(1\)/)
})

test('product table follows the shared admin density and keeps the name column narrower', () => {
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(150px,\s*0\.85fr\)\s+minmax\(280px,\s*2\.3fr\)\s+150px\s+140px\s+56px/,
  )
  assert.match(styles, /\.product-list__table-header\s*\{[^}]*min-height:\s*40px/s)
  assert.match(styles, /\.product-list__row\s*\{[^}]*min-height:\s*48px/s)
  assert.match(styles, /\.product-list__name\s*\{[^}]*font-size:\s*13px[^}]*font-weight:\s*700/s)
  assert.match(styles, /\.product-list__summary\s*\{[^}]*font-size:\s*12px[^}]*line-height:\s*18px/s)
  assert.match(styles, /\.product-list__table-header\s*>\s*span\s*\{[^}]*padding:\s*0 14px/s)
  assert.match(styles, /\.product-list__row\s*>\s*\*\s*\{[^}]*padding:\s*14px/s)
  assert.match(styles, /\.product-list__progress,[\s\S]*?font-size:\s*11px[\s\S]*?line-height:\s*16px/)
  assert.match(styles, /\.product-list__heading\s*\{[^}]*margin-bottom:\s*22px/s)
})

test('product list provides news-style refresh feedback and return animation with reduced-motion support', () => {
  assert.match(componentSource, /product-list__page-content--back-enter/)
  assert.match(styles, /\.product-list__content--refreshing \.product-list__table,[\s\S]*?opacity:\s*0\.72/)
  assert.match(styles, /\.product-list__page-content--back-enter\s*\{[^}]*animation:/s)
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
  assert.match(detailSource, /state=\{\{ productNavigation: 'back-to-list' \}\}/)
  assert.match(editSource, /state=\{\{ productNavigation: 'back-to-list' \}\}/)
})

test('product view tabs stay fixed at the same viewport center as member and partner lists', () => {
  assert.match(styles, /\.product-list__tabs \{[^}]*position:\s*fixed;[^}]*left:\s*50%;/s)
  assert.doesNotMatch(styles, /\.product-list__tabs \{[^}]*left:\s*calc\(50% \+/s)
  assert.doesNotMatch(styles, /\.admin-sidebar--collapsed \+ \.admin-shell__main \.product-list__tabs/)
})
