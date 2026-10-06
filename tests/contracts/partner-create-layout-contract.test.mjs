import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const createSource = read('../../src/features/partners/components/create-partner-form.tsx')
const typesSource = read('../../src/features/partners/types.ts')
const serviceSource = read('../../src/features/partners/services/partner.service.ts')
const stylesSource = read('../../src/styles/partners.css')

test('partner create uses the detail shell and one two-column sheet', () => {
  assert.doesNotMatch(createSource, /partner-edit__page-header/)
  assert.match(createSource, /className="partner-create__heading"/)
  assert.match(createSource, /className="partner-create__toolbar"/)
  assert.match(createSource, /className="partner-create__action partner-create__action--cancel"/)
  assert.match(createSource, /className="partner-create__action partner-create__action--submit"/)
  assert.match(createSource, /className="partner-create__sheet"/)
  assert.match(createSource, /className="partner-create__content-grid"/)
  assert.match(createSource, /className="partner-create__fields"/)
  assert.match(createSource, /className="partner-create__logo-column"/)
  assert.match(createSource, /<PartnerLogoUpload/)
  assert.doesNotMatch(createSource, /name="logoUrl"/)
  assert.doesNotMatch(createSource, /LOGO URL/)
  assert.match(createSource, /logo:\s*selectedLogo/)
  assert.match(typesSource, /interface CreatePartnerRequest[\s\S]*logo\?: File/)
  assert.match(serviceSource, /function buildCreateFormData[\s\S]*formData\.append\('logo', payload\.logo\)/)
  assert.match(createSource, /id="partner-create-form"/)
  assert.match(createSource, /<Chip[\s\S]*className="partner-create__publish-status"[\s\S]*>\s*Chưa đăng/s)
  assert.doesNotMatch(createSource, /partner-create__publish-section/)

  assert.match(stylesSource, /\.partner-create \{[^}]*padding:\s*24px 28px 32px;[^}]*background:\s*#fbfaf8;/s)
  assert.match(stylesSource, /\.partner-create__breadcrumb \{[^}]*gap:\s*5px;[^}]*margin-bottom:\s*12px;/s)
  assert.match(stylesSource, /\.partner-create__sheet \{[^}]*border:\s*1px solid #e2e8f0;[^}]*border-radius:\s*10px;[^}]*padding:\s*28px;/s)
  assert.match(stylesSource, /\.partner-create__content-grid \{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*18px;[^}]*border-top:\s*1px solid #edf0f3;/s)
  assert.match(stylesSource, /\.partner-create__field > span \{[^}]*color:\s*#475569;[^}]*font-size:\s*11px;/s)
  assert.match(stylesSource, /\.partner-create__field input,[\s\S]*?\.partner-create__field textarea \{[^}]*border:\s*1px solid #d9dee5;[^}]*border-radius:\s*8px;/s)
  assert.match(stylesSource, /\.partner-create__field input \{[^}]*height:\s*38px;[^}]*font-size:\s*12px;/s)
  assert.match(stylesSource, /\.partner-create__action \{[^}]*min-height:\s*34px;[^}]*border-radius:\s*7px;[^}]*font-size:\s*11px;[^}]*font-weight:\s*750;/s)
})
