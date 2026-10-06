import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const contactDetail = read('../../src/features/contacts/components/contact-detail.tsx')
const contactStyles = read('../../src/styles/contacts.css')

test('contact detail renders customer data as read-only values instead of input-like fields', () => {
  assert.doesNotMatch(contactDetail, /<(?:Input|TextField)\b/)
  assert.match(contactDetail, /<p className="contact-detail__message">\{displayValue\(contact\.message\)\}<\/p>/)
  assert.match(
    contactStyles,
    /\.contact-detail__field > strong,\s*\.contact-detail__message\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s,
  )
  assert.match(
    contactStyles,
    /\.contact-detail__field > strong\s*\{[^}]*min-height:\s*0;[^}]*padding:\s*0;/s,
  )
})
