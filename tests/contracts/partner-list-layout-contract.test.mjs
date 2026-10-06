import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const styles = readFileSync(
  fileURLToPath(new URL('../../src/styles/partners.css', import.meta.url)),
  'utf8',
)

test('partner list gives the description more room while keeping website to its right', () => {
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(150px,\s*0\.78fr\)\s+minmax\(280px,\s*1\.15fr\)\s+minmax\(190px,\s*0\.9fr\)\s+210px\s+56px/,
  )
})
