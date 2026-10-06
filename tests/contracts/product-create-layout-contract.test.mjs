import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const componentSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/create-product-form.tsx', import.meta.url)),
  'utf8',
)
const mediaSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/product-media-manager.tsx', import.meta.url)),
  'utf8',
)
const styles = readFileSync(
  fileURLToPath(new URL('../../src/styles/products.css', import.meta.url)),
  'utf8',
)

test('product create uses one sheet with a detail-aligned two-column layout', () => {
  assert.doesNotMatch(componentSource, /product-create__page-header/)
  assert.doesNotMatch(componentSource, /product-edit__top-grid|product-create__draft-note/)
  assert.match(componentSource, /product-edit__sheet product-create__sheet/)
  assert.match(componentSource, /product-create__layout/)
  assert.match(componentSource, /product-create__assets-column/)
  assert.match(componentSource, /product-create__content-column/)
  assert.match(componentSource, /product-create__assets-column[\s\S]*ProductMediaManager[\s\S]*Product URL/)
  assert.match(componentSource, /product-create__content-column[\s\S]*product-create__content-section/)
  assert.match(componentSource, /product-create__sheet[\s\S]*product-create__layout/)
})

test('product create keeps the existing submit payload and action flow', () => {
  assert.match(componentSource, /buildProductMediaMutation\(media\)/)
  assert.match(componentSource, /createProduct\.mutateAsync\(payload\)/)
  assert.match(componentSource, /handleSubmit\(create\)/)
  assert.match(componentSource, /onClick=\{\(\) => navigate\(ROUTE_PATHS\.PRODUCTS\)\}/)
})

test('product create media manager exposes inline presentation without changing media actions', () => {
  assert.match(componentSource, /variant="create-inline"/)
  assert.match(mediaSource, /variant\?: 'default' \| 'create-inline'/)
  assert.match(mediaSource, /product-media--inline/)
  assert.match(styles, /\.product-create__layout\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/)
  assert.match(styles, /\.product-media--inline\s+\.product-media__slots\s*\{[\s\S]*grid-template-columns:\s*1fr/)
})

test('product create keeps only the header divider and moves name plus actions to the requested positions', () => {
  assert.match(componentSource, /product-create__toolbar[\s\S]*product-edit__sheet product-create__sheet/)
  assert.match(componentSource, /product-create__summary-card[\s\S]*name="name"/)
  assert.doesNotMatch(componentSource, /product-create__name-field/)
  assert.doesNotMatch(componentSource, /product-create__actions/)
  assert.match(styles, /\.product-create__breadcrumb\s*\{[^}]*margin-bottom:\s*12px/)
  assert.match(styles, /\.product-create__layout\s*\{[^}]*margin-top:\s*24px[^}]*border-top:\s*1px solid #edf0f3[^}]*padding-top:\s*20px/)
  assert.match(styles, /\.product-create__content-section\s*\{[^}]*margin-top:\s*0/)
  assert.match(styles, /\.product-create__block\s*\{[^}]*border-bottom:\s*0/)
  assert.match(styles, /\.product-media--inline\s+\.product-media__slot\s*\{[^}]*border-bottom:\s*0/)
})

test('product create aligns the asset and content headings and hides non-field helper labels', () => {
  assert.doesNotMatch(componentSource, />Tùy chọn</)
  assert.doesNotMatch(componentSource, /product-create__header-name-field[\s\S]*<span>Name/)
  assert.match(componentSource, /product-create__header-name-field[\s\S]*aria-label="Tên sản phẩm"/)
  assert.match(styles, /\.product-create__content-heading h2\s*\{[^}]*line-height:\s*1\.2/)
  assert.match(styles, /\.product-media--inline \.product-media__slot-header strong\s*\{[^}]*line-height:\s*14px/)
})

test('product create uses identical heading wrappers for media and Content', () => {
  assert.match(mediaSource, /product-media__slot-header[^`]*product-create__field-heading/)
  assert.match(componentSource, /product-create__content-heading product-create__field-heading/)
  assert.match(
    styles,
    /\.product-create__field-heading\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*height:\s*14px/,
  )
  assert.match(styles, /\.product-create__field-heading > div,[\s\S]*\.product-create__field-heading > strong\s*\{[^}]*line-height:\s*14px/)
})

test('product create keeps the name input compact and right-aligns media actions', () => {
  assert.match(styles, /\.product-create__header-name-field\s*\{[^}]*flex:\s*0 0 calc\(\(100% - 18px\) \/ 2 - 64px\)/)
  assert.match(styles, /\.product-media--inline \.product-media__slot-status\s*\{[^}]*display:\s*none/)
  assert.match(styles, /\.product-media--inline \.product-media__slot-actions\s*\{[^}]*justify-content:\s*flex-end/)
})

test('product create features follow the job skills add/remove flow', () => {
  assert.match(componentSource, /Xóa feature/)
  assert.match(componentSource, /currentItems\.filter/)
  assert.match(componentSource, /product-content-block__body--feature[\s\S]*product-create__feature-field/)
  assert.match(componentSource, /product-create__feature-row/)
  assert.match(componentSource, /aria-label=\{`Feature \$\{featureIndex \+ 1\}`\}/)
  assert.match(styles, /\.product-content-block__body--feature\s*\{[^}]*padding-bottom:/)
  assert.match(styles, /\.product-create__feature-field\s*\{[\s\S]*background:\s*#fff;[\s\S]*padding:\s*12px/)
  assert.match(styles, /\.product-create__feature-heading\s*\{[\s\S]*justify-content:\s*flex-start/)
  assert.match(styles, /\.product-create__feature-items\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap/)
  assert.match(styles, /\.product-create__feature-row\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*width:\s*fit-content;[\s\S]*border:\s*1px solid #d8e0e8/)
  assert.match(styles, /\.product-create__feature-row input\s*\{[\s\S]*width:\s*120px;[\s\S]*min-height:\s*30px;[\s\S]*border:\s*0/)
  assert.match(styles, /\.product-create__feature-row button\s*\{[\s\S]*width:\s*24px;[\s\S]*height:\s*24px/)
})

test('product create content keeps only the input forms for title, description, and category', () => {
  assert.doesNotMatch(componentSource, /<strong>Title<\/strong>/)
  assert.doesNotMatch(componentSource, /<strong>Description<\/strong>/)
  assert.doesNotMatch(componentSource, /<strong>Category<\/strong>/)
  assert.match(styles, /\.product-content-card__blocks\s*\{[^}]*gap:\s*0/)
})

test('product create content is a single sortable card whose block titles are drag targets', () => {
  assert.match(componentSource, /product-content-card/)
  assert.match(componentSource, /product-content-block__title/)
  assert.match(componentSource, /draggable=\{!createProduct\.isPending\}/)
  assert.match(componentSource, /reorderProductContentBlocks/)
  assert.match(styles, /\.product-content-card\s*\{[^}]*border:/)
  assert.match(styles, /\.product-content-block__title\s*\{[^}]*cursor:\s*grab/)
})

