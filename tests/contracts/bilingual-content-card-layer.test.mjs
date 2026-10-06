import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(
  new URL('../../src/styles/bilingual-content-tabs.css', import.meta.url),
  'utf8',
)
const productStyles = readFileSync(
  new URL('../../src/styles/products.css', import.meta.url),
  'utf8',
)

function declarationBlock(selector) {
  const match = styles.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\}`))
  assert.ok(match, `Missing CSS rule: ${selector}`)
  return match[1]
}

test('bilingual card keeps tabs above the card mask while active tab controls inactive tab', () => {
  const cardMask = declarationBlock('\\.bilingual-content-card::before')
  const tabs = declarationBlock('\\.bilingual-content-card__tabs')

  assert.match(cardMask, /z-index:\s*2\s*;/)
  assert.doesNotMatch(tabs, /z-index:/)
  assert.match(tabs, /left:\s*24px\s*;/)
  assert.match(tabs, /right:\s*auto\s*;/)
  assert.match(styles, /\.bilingual-content-tabs__tab\[data-active='true'\]\s*\{[\s\S]*?z-index:\s*3\s*;/)
  assert.match(styles, /\.bilingual-content-tabs__tab:not\(\[data-active='true'\]\)\s*\{[\s\S]*?z-index:\s*1\s*;/)
})

test('product bilingual cards use the shared card offset and spacing', () => {
  assert.doesNotMatch(productStyles, /\.product-detail__bilingual-sheet,\s*\.product-edit__bilingual-sheet,\s*\.product-create__bilingual-sheet\s*\{\s*margin-top:\s*12px\s*;/)
  assert.doesNotMatch(productStyles, /\.product-detail__bilingual-sheet\s*>\s*\.bilingual-content-card__tabs,\s*\.product-edit__bilingual-sheet\s*>\s*\.bilingual-content-card__tabs,\s*\.product-create__bilingual-sheet\s*>\s*\.bilingual-content-card__tabs\s*\{\s*top:\s*-17px\s*;/)
})
