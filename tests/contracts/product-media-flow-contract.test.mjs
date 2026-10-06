import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const detailSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/product-detail.tsx', import.meta.url)),
  'utf8',
)
const createSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/create-product-form.tsx', import.meta.url)),
  'utf8',
)
const mediaSource = readFileSync(
  fileURLToPath(new URL('../../src/features/products/components/product-media-manager.tsx', import.meta.url)),
  'utf8',
)

test('product detail does not expose the logo URL field', () => {
  assert.doesNotMatch(detailSource, /<dt>Logo URL<\/dt>/)
})

test('product create uses file media controls without URL labels', () => {
  assert.match(createSource, /<ProductMediaManager[\s\S]*variant="create-inline"/)
  assert.match(mediaSource, /type="file"/)
  assert.doesNotMatch(mediaSource, /label: variant === 'create-inline' \? 'Logo URL' : 'Logo'/)
  assert.doesNotMatch(mediaSource, /label: variant === 'create-inline' \? 'Wordmark URL' : 'Wordmark'/)
  assert.match(mediaSource, /label: 'Logo'/)
  assert.match(mediaSource, /label: 'Wordmark'/)
})
