import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const stylesPath = fileURLToPath(new URL('../../src/styles/members.css', import.meta.url))
const styles = readFileSync(stylesPath, 'utf8')
const partnerStylesPath = fileURLToPath(new URL('../../src/styles/partners.css', import.meta.url))
const partnerStyles = readFileSync(partnerStylesPath, 'utf8')

function getTabRules(source, className) {
  const selector = new RegExp(`^[\\t ]*\\.${className}\\s*\\{([^}]*)\\}`, 'gm')

  return [...source.matchAll(selector)].map((match) => match[1])
}

function getPositioningRules(source, className) {
  const rules = getTabRules(source, className)
  const leftPositions = rules.map((rule) => rule.match(/left:\s*([^;]+)/)?.[1].trim())
  const bottomPositions = rules.map((rule) => rule.match(/bottom:\s*([^;]+)/)?.[1].trim())

  return { rules, leftPositions, bottomPositions }
}

test('member view tabs stay centered and fixed when the sidebar opens or collapses', () => {
  const { rules, leftPositions, bottomPositions } = getPositioningRules(
    styles,
    'team-member-list__tabs',
  )

  assert.equal(rules.length, 2, 'desktop and mobile positioning rules exist')
  assert.match(rules[0], /position:\s*fixed/)
  assert.deepEqual(leftPositions, ['50%', '50%'])
  assert.deepEqual(bottomPositions, ['22px', '16px'])
  assert.doesNotMatch(
    styles,
    /\.admin-sidebar--collapsed\s*\+\s*\.admin-shell__main\s+\.team-member-list__tabs/,
  )
})

test('partner view tabs use the same centered fixed position as member view tabs', () => {
  const { rules, leftPositions, bottomPositions } = getPositioningRules(
    partnerStyles,
    'partner-list__tabs',
  )

  assert.equal(rules.length, 2, 'desktop and mobile positioning rules exist')
  assert.match(rules[0], /position:\s*fixed/)
  assert.deepEqual(leftPositions, ['50%', '50%'])
  assert.deepEqual(bottomPositions, ['22px', '16px'])
  assert.doesNotMatch(
    partnerStyles,
    /\.admin-sidebar--collapsed\s*\+\s*\.admin-shell__main\s+\.partner-list__tabs/,
  )
})
