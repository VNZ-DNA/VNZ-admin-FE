import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeProductRichText } from '../../src/features/products/product-rich-text.ts'

test('Product rich text keeps the approved formatting tags', () => {
  assert.equal(
    sanitizeProductRichText('<p><strong>VNZ</strong> <em>Flow</em></p><ul><li>Fast</li></ul>'),
    '<p><strong>VNZ</strong> <em>Flow</em></p><ul><li>Fast</li></ul>',
  )
})

test('Product rich text removes executable markup and unsafe links', () => {
  const sanitized = sanitizeProductRichText(
    '<script>alert(1)</script><p onclick="alert(2)">Safe</p><a href="javascript:alert(3)">Link</a>',
  )

  assert.equal(sanitized, '<p>Safe</p><a>Link</a>')
  assert.doesNotMatch(sanitized, /script|onclick|javascript:/i)
})

test('Product rich text preserves legacy plain text as escaped text', () => {
  assert.equal(sanitizeProductRichText('Nội dung cũ <chưa định dạng>'), 'Nội dung cũ &lt;chưa định dạng&gt;')
})
