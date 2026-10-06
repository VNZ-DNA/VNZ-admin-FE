import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const typesSource = read('../../src/features/partners/types.ts')
const serviceSource = read('../../src/features/partners/services/partner.service.ts')
const listSource = read('../../src/features/partners/components/partner-list.tsx')
const detailSource = read('../../src/features/partners/components/partner-detail.tsx')
const stylesSource = read('../../src/styles/partners.css')

test('partner soft delete follows the TDD contract in list and detail flows', () => {
  assert.match(typesSource, /canDelete\?: boolean/)
  assert.match(typesSource, /deleteBlockedReason\?: string \| null/)
  assert.match(typesSource, /export interface DeletePartnerResult/)
  assert.match(serviceSource, /async deletePartner\(id: string\): Promise<DeletePartnerResult>/)
  assert.match(serviceSource, /api\.delete<ApiResponse<DeletePartnerResult>>\(`\/api\/v1\/admin\/partners\/\$\{id\}`\)/)
  assert.match(listSource, /useDeletePartner/)
  assert.match(listSource, /canDelete=\{partner\.canDelete\}/)
  assert.match(listSource, /deleteBlockedReason=\{partner\.deleteBlockedReason\}/)
  assert.match(listSource, /onRequestDelete=\{\(\) => requestDelete\(partner\)\}/)
  assert.match(listSource, /<Trash2/)
  assert.match(listSource, /PartnerDeleteConfirmationModal/)
  assert.match(detailSource, /useDeletePartner/)
  assert.match(detailSource, /PartnerDeleteConfirmationModal/)
  assert.match(detailSource, /isDisabled=\{!canDelete \|\| deletePartner\.isPending\}/)
})

test('partner detail follows the news action spacing and product two-column content layout', () => {
  assert.doesNotMatch(detailSource, /partner-detail__page-header/)
  assert.doesNotMatch(detailSource, /<dt>Name<\/dt>/)
  assert.doesNotMatch(detailSource, /partner-detail__description-section/)
  assert.doesNotMatch(detailSource, /partner-detail__publish-section/)
  assert.match(detailSource, /partner-detail__heading--actions-only/)
  assert.match(detailSource, /partner-detail__toolbar/)
  assert.match(detailSource, /partner-detail__summary-card/)
  assert.match(detailSource, /partner-detail__detail-columns/)
  assert.match(detailSource, /partner-detail__assets-column/)
  assert.match(detailSource, /partner-detail__logo-column/)
  assert.doesNotMatch(detailSource, /<dt>Logo URL<\/dt>/)
  assert.match(detailSource, /<dt>Website URL<\/dt>/)
  assert.match(detailSource, /<dt>Description<\/dt>/)
  assert.match(stylesSource, /\.partner-detail__detail-columns \{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)[^}]*align-items:\s*stretch;/s)
  assert.match(stylesSource, /\.partner-detail__detail-columns[^}]*border-top:\s*1px solid #edf0f3/s)
  assert.match(stylesSource, /\.partner-detail__heading \{[^}]*margin-bottom:\s*18px;/s)
  assert.match(stylesSource, /\.partner-detail__info-field \{[^}]*grid-template-columns:\s*82px\s+minmax\(0,\s*1fr\)/s)
  assert.match(stylesSource, /\.partner-detail__info-field dt \{[^}]*letter-spacing:\s*0;[^}]*text-transform:\s*none;/s)
})
