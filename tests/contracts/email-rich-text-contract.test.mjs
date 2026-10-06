import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const interviewSchema = read('../../src/features/applicants/schemas/interview-invitation-template.schema.ts')
const interviewTypes = read('../../src/features/applicants/types.ts')
const interviewEditor = read('../../src/features/applicants/components/email-rich-text-editor.tsx')
const interviewComposer = read('../../src/features/applicants/components/interview-email-composer.tsx')
const interviewPreview = read('../../src/features/applicants/utils/render-interview-invitation-preview.ts')
const contactSchema = read('../../src/features/contacts/schemas/contact-reply-template.schema.ts')
const contactEditor = read('../../src/features/contacts/components/contact-email-rich-text-editor.tsx')
const contactComposer = read('../../src/features/contacts/components/contact-email-composer.tsx')

test('email template policy validates non-empty allowlists and integer length limits', () => {
  assert.match(interviewSchema, /allowedTags:\s*z\.array\(z\.string\(\)\.min\(1\)\)\.min\(1\)/)
  assert.match(interviewSchema, /allowedLinkProtocols:\s*z\.array\(z\.string\(\)\.min\(1\)\)\.min\(1\)/)
  assert.match(interviewSchema, /maxHtmlLength:\s*z\.number\(\)\.int\(\)\.positive\(\)/)
  assert.match(contactSchema, /maxHtmlLength:\s*z\.number\(\)\.int\(\)\.positive\(\)/)
})

test('interview and contact rich-text forms send the contract fields and isolate previews', () => {
  assert.match(interviewTypes, /interviewInformationHtml\?: string/)
  assert.match(interviewTypes, /agendaHtml: string/)
  assert.match(interviewTypes, /preparationHtml: string/)
  assert.match(interviewEditor, /new URL\(trimmed\)/)
  assert.match(contactEditor, /new URL\(trimmed\)/)
  assert.match(interviewComposer, /sandbox=""/)
  assert.match(contactComposer, /sandbox=""/)
  assert.match(interviewPreview, /fixedCopyKey !== 'greeting'/)
})
