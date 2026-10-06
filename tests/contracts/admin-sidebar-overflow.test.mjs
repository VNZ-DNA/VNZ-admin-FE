import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const stylesPath = fileURLToPath(new URL('../../src/styles/globals.css', import.meta.url))
const styles = readFileSync(stylesPath, 'utf8')
const sidebarNavRule = styles.match(/\.admin-sidebar__nav\s*\{([^}]*)\}/s)?.[1]

test('sidebar navigation remains vertically scrollable without horizontal scrolling', () => {
  assert.ok(sidebarNavRule, 'sidebar navigation styles exist')
  assert.match(sidebarNavRule, /overflow-y:\s*auto/)
  assert.match(sidebarNavRule, /overflow-x:\s*hidden/)
})
