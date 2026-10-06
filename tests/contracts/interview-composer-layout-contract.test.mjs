import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const componentSource = readFileSync(
  fileURLToPath(new URL('../../src/features/applicants/components/interview-email-composer.tsx', import.meta.url)),
  'utf8',
)
const styles = readFileSync(
  fileURLToPath(new URL('../../src/styles/applicants.css', import.meta.url)),
  'utf8',
)
const previewSource = readFileSync(
  fileURLToPath(new URL('../../src/features/applicants/utils/render-interview-invitation-preview.ts', import.meta.url)),
  'utf8',
)

test('interview composer keeps title and actions together without a footer action bar', () => {
  assert.match(componentSource, /interview-invitation-page__header[\s\S]*interview-invitation-page__actions/)
  assert.doesNotMatch(componentSource, /className="interview-invitation-page__recipient-count"/)
  assert.doesNotMatch(componentSource, /<footer className="interview-invitation-page__footer/)
  assert.doesNotMatch(styles, /\.interview-invitation-page__footer\s*\{[\s\S]*position:\s*sticky/)
})

test('interview composer renders applicants as wrapping cards followed by a fixed count card', () => {
  assert.match(componentSource, /interview-invitation-page__recipient-list[\s\S]*selectedApplicants\.map\(\(applicant\)/)
  assert.match(componentSource, /interview-invitation-page__recipient-card/)
  assert.match(componentSource, /interview-invitation-page__recipient-count-card/)
  assert.doesNotMatch(componentSource, /selectedApplicants\.map\(\(applicant\) => applicant\.fullName\)\.join\(','\)/)
  assert.match(styles, /\.interview-invitation-page__recipient-list\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap/)
  assert.match(styles, /\.interview-invitation-page__recipients\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/)
  assert.match(styles, /\.interview-invitation-page__recipient-count-card\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center/)
})

test('interview composer uses equal columns and one white form card', () => {
  assert.match(componentSource, /interview-composer__form-pane interview-composer__form-card/)
  assert.match(styles, /\.interview-composer__layout\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)/)
  assert.match(styles, /\.interview-composer__form-card\s*\{[\s\S]*background:\s*#fff;[\s\S]*border:/)
  assert.match(styles, /\.interview-composer__form-card \.interview-composer__section\s*\{[\s\S]*border:\s*0;/)
})

test('interview preview keeps only position metadata', () => {
  assert.doesNotMatch(componentSource, /interview-composer__preview-recipient/)
  assert.doesNotMatch(componentSource, /<span>Người nhận<\/span>/)
  assert.doesNotMatch(componentSource, /<span>Subject<\/span>/)
  assert.match(componentSource, /interview-composer__preview-position-summary/)
  assert.match(componentSource, /Vị trí/)
  assert.match(styles, /\.interview-composer__preview-position-summary\s*\{[\s\S]*display:\s*grid/)
})

test('interview preview formats the ISO date for candidates while keeping the API date contract', () => {
  assert.match(componentSource, /interviewDate:\s*values\.interviewDate/)
  assert.match(previewSource, /function formatInterviewDate\(value: string \| undefined\)/)
  assert.match(previewSource, /formatInterviewDate\(values\.interviewDate\)/)
  assert.doesNotMatch(previewSource, /values\.interviewTime \|\| '—'\} ngày \$\{values\.interviewDate \|\| '—'\}/)
})

test('interview composer uses an in-app leave confirmation modal only for unsent changes', () => {
  assert.doesNotMatch(componentSource, /window\.confirm/)
  assert.match(componentSource, /const closeConfirmation = useOverlayState\(\)/)
  assert.match(componentSource, /if \(!result && isDirty\)\s*\{[\s\S]*?closeConfirmation\.open\(\)/)
  assert.match(componentSource, /<Modal\.Root state=\{closeConfirmation\}>/)
  assert.match(componentSource, /Nội dung chưa gửi sẽ bị mất\./)
  assert.match(componentSource, /Rời khỏi trang/)
  assert.match(componentSource, /applicant-review-confirm__reject/)
})

test('interview preview hides the greeting block without changing the send payload', () => {
  assert.match(previewSource, /fixedCopyKey !== 'greeting'/)
  assert.match(previewSource, /buildInterviewInvitationPreviewHtml/)
  assert.match(componentSource, /buildSendPayload\(values, applicationIds\)/)
  assert.doesNotMatch(componentSource, /interviewInformationHtml[\s\S]*greeting/)
})

test('interview preview lists every position with the applicants in that position', () => {
  assert.match(componentSource, /previewPositionGroups/)
  assert.match(componentSource, /jobPostId/)
  assert.match(componentSource, /group\.applicants\.map\(\(applicant\)/)
  assert.match(componentSource, /jobPostSnapshotTitle \?\? applicant\.jobPostTitle/)
  assert.match(styles, /\.interview-composer__preview-position-group\s*\{[\s\S]*display:\s*grid/)
})

test('interview preview keeps position titles outside wrapping applicant cards', () => {
  assert.match(componentSource, /preview-position-title[\s\S]*group\.applicants\.map/)
  assert.match(componentSource, /interview-composer__preview-applicant-card/)
  assert.match(styles, /\.interview-composer__preview-position-group\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/)
  assert.match(styles, /\.interview-composer__preview-applicant-card\s*\{[^}]*border:/)
})
