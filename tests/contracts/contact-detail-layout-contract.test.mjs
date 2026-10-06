import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const contactDetail = read('../../src/features/contacts/components/contact-detail.tsx')
const contactStyles = read('../../src/styles/contacts.css')
const bilingualCardStyles = read('../../src/styles/bilingual-content-tabs.css')

test('contact detail uses an action-only heading and groups customer fields into two columns', () => {
  assert.match(contactDetail, /className="contact-detail__heading contact-detail__heading--actions-only"/)
  assert.match(contactDetail, /className="contact-detail__action contact-detail__action--reply"/)
  assert.doesNotMatch(contactDetail, /<h1>\{contact\.fullName\}<\/h1>/)
  assert.doesNotMatch(contactDetail, /Trạng thái liên hệ/)
  assert.match(contactDetail, /className="contact-detail__columns"/)
  assert.match(contactDetail, /className="contact-detail__column contact-detail__column--identity"/)
  assert.match(contactDetail, /className="contact-detail__column contact-detail__column--context"/)

  const identityColumn = contactDetail.indexOf('contact-detail__column--identity')
  const contextColumn = contactDetail.indexOf('contact-detail__column--context')
  assert.ok(identityColumn < contextColumn)
  assert.ok(contactDetail.indexOf('>Họ và tên<', identityColumn) < contactDetail.indexOf('>Email<', identityColumn))
  assert.ok(contactDetail.indexOf('>Email<', identityColumn) < contactDetail.indexOf('>Điện thoại / Zalo<', identityColumn))
  assert.ok(contactDetail.indexOf('>Công ty / Tổ chức<', contextColumn) < contactDetail.indexOf('>Bạn liên hệ về việc gì?<', contextColumn))
  assert.ok(contactDetail.indexOf('>Bạn liên hệ về việc gì?<', contextColumn) < contactDetail.indexOf('>Nguồn biết đến VNZ<', contextColumn))
})

test('contact detail follows news detail spacing and surface tokens', () => {
  assert.match(contactStyles, /\.contact-detail,\s*\.contact-detail__error \{[^}]*padding:\s*24px 28px 32px;/s)
  assert.match(contactStyles, /\.contact-detail__breadcrumb \{[^}]*gap:\s*5px;[^}]*margin-bottom:\s*12px;/s)
  assert.match(contactStyles, /\.contact-detail__heading \{[^}]*margin-bottom:\s*18px;/s)
  assert.match(contactStyles, /\.contact-detail__sheet \{[^}]*border:\s*1px solid #e2e8f0;[^}]*border-radius:\s*10px;[^}]*padding:\s*28px;/s)
  assert.match(contactStyles, /\.contact-detail__summary-main strong \{[^}]*color:\s*#273240;[^}]*font-size:\s*18px;[^}]*font-weight:\s*750;/s)
  assert.match(contactStyles, /\.contact-detail__section h2 \{[^}]*color:\s*#273240;[^}]*font-size:\s*15px;[^}]*font-weight:\s*800;/s)
  assert.match(contactStyles, /\.contact-detail__field > strong,\s*\.contact-detail__message \{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*color:\s*#4b5563;[^}]*font-size:\s*12px;/s)
  assert.match(bilingualCardStyles, /\.bilingual-content-card \{[^}]*--bilingual-card-border:\s*#e2e8f0;[^}]*border:\s*1px solid var\(--bilingual-card-border\);[^}]*border-radius:\s*10px;/s)
})
