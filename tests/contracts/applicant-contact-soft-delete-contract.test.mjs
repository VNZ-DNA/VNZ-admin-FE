import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const applicantTypes = read('../../src/features/applicants/types.ts')
const applicantService = read('../../src/features/applicants/services/job-application.service.ts')
const applicantList = read('../../src/features/applicants/components/applicant-list.tsx')
const applicantMenuPosition = read('../../src/features/applicants/utils/applicant-action-menu-position.ts')
const applicantDetail = read('../../src/features/applicants/components/applicant-detail.tsx')
const applicantStyles = read('../../src/styles/applicants.css')
const contactTypes = read('../../src/features/contacts/types.ts')
const contactService = read('../../src/features/contacts/services/contact.service.ts')
const contactList = read('../../src/features/contacts/components/contact-list.tsx')

test('applicant list exposes the TDD soft-delete flow with the news-list action menu', () => {
  assert.match(applicantTypes, /export interface DeleteJobApplicationResult/)
  assert.match(applicantService, /async deleteJobApplication\(id: string\)/)
  assert.match(applicantService, /api\.delete<ApiResponse<DeleteJobApplicationResult>>\(\s*`\/api\/v1\/admin\/job-applications\/\$\{id\}`/)
  assert.match(applicantList, /useDeleteJobApplication/)
  assert.match(applicantList, /<Trash2/)
  assert.match(applicantList, /Xóa hồ sơ ứng viên/)
  assert.match(applicantList, /JobApplicationDeleteConfirmationModal/)
  assert.match(applicantMenuPosition, /const menuHeight = 100/)
})

test('contact list keeps row navigation and postpones soft-delete UI', () => {
  assert.match(contactTypes, /export interface DeleteContactResult/)
  assert.match(contactService, /async deleteContact\(id: string\)/)
  assert.match(contactService, /api\.delete<ApiResponse<DeleteContactResult>>\(\s*`\/api\/v1\/admin\/contacts\/\$\{id\}`/)
  assert.match(contactList, /onClick=\{\(\) => navigate\(ROUTE_PATHS\.CONTACT_DETAIL\.replace\(':id', item\.id\)\)\}/)
  assert.match(contactList, /onKeyDown=\{\(event\) => \{/)
  assert.doesNotMatch(contactList, /useDeleteContact/)
  assert.doesNotMatch(contactList, /<Trash2/)
  assert.doesNotMatch(contactList, /Xóa liên hệ/)
  assert.doesNotMatch(contactList, /ContactDeleteConfirmationModal/)
  assert.doesNotMatch(contactList, /contact-list__actions-heading/)
})

test('applicant job snapshot presents four balanced metadata columns in the requested order', () => {
  const summary = applicantDetail.match(
    /<div className="applicant-detail__job-summary">([\s\S]*?)<\/div>\s*<div className="applicant-detail__job-section">/,
  )?.[1]

  assert.ok(summary, 'job summary markup exists')
  assert.match(summary, /<span>BỘ PHẬN<\/span>[\s\S]*snapshot\.departmentName/)
  assert.match(summary, /BỘ PHẬN[\s\S]*HÌNH THỨC[\s\S]*CẤP BẬC[\s\S]*CHỈ TIÊU/)
  assert.doesNotMatch(applicantDetail, /applicant-detail__job-department/)
  assert.match(
    applicantStyles,
    /\.applicant-detail__job-summary\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s,
  )
})

test('applicant job description and requirements use the sanitized rich-text renderer', () => {
  assert.match(applicantDetail, /import \{ RichTextContent \} from '@\/features\/news\/components\/rich-text-content'/)
  assert.match(
    applicantDetail,
    /<RichTextContent html=\{snapshot\.description\} className="applicant-detail__job-rich-text" \/>/,
  )
  assert.match(
    applicantDetail,
    /<RichTextContent html=\{snapshot\.requirements\} className="applicant-detail__job-rich-text" \/>/,
  )
  assert.doesNotMatch(applicantDetail, /<p>\{snapshot\.description \|\| '—'\}<\/p>/)
  assert.doesNotMatch(applicantDetail, /<p>\{snapshot\.requirements \|\| '—'\}<\/p>/)
  assert.match(applicantStyles, /\.applicant-detail__job-rich-text\s*\{[^}]*line-height:\s*1\.75;/s)
  assert.match(applicantStyles, /\.applicant-detail__job-rich-text\s+p\s*\{[^}]*margin:\s*0(?:\s+0\s+10px)?;/s)
})
