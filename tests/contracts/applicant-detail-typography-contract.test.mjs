import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const styles = readFileSync(new URL('../../src/styles/applicants.css', import.meta.url), 'utf8')

test('applicant detail typography follows the customer detail tokens', () => {
  assert.match(
    styles,
    /\.applicant-detail__profile-copy strong\s*\{[^}]*color:\s*#273240;[^}]*font-size:\s*18px;[^}]*font-weight:\s*750;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__profile-copy span\s*\{[^}]*color:\s*#94a3b8;[^}]*font-size:\s*10px;[^}]*line-height:\s*1\.5;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__content-section h2\s*\{[^}]*color:\s*#273240;[^}]*font-size:\s*15px;[^}]*font-weight:\s*800;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__info-grid\s*\{[^}]*gap:\s*14px 24px;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__info-grid > div,\s*\.applicant-detail__link-grid > div,\s*\.applicant-detail__cover-letter\s*\{[^}]*gap:\s*7px;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__info-grid span,\s*\.applicant-detail__link-grid span,\s*\.applicant-detail__cover-letter > span\s*\{[^}]*color:\s*#94a3b8;[^}]*font-size:\s*11px;[^}]*font-weight:\s*700;[^}]*letter-spacing:\s*normal;/s,
  )
  assert.match(
    styles,
    /\.applicant-detail__info-grid strong,\s*\.applicant-detail__link-grid strong\s*\{[^}]*color:\s*#4b5563;[^}]*font-size:\s*12px;[^}]*font-weight:\s*500;[^}]*line-height:\s*1\.5;/s,
  )
})
