import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const componentPath = fileURLToPath(
  new URL('../../src/features/members/components/team-member-list.tsx', import.meta.url),
)
const componentSource = readFileSync(componentPath, 'utf8')
const routerPath = fileURLToPath(new URL('../../src/routes/router.tsx', import.meta.url))
const routerSource = readFileSync(routerPath, 'utf8')
const editFormPath = fileURLToPath(
  new URL('../../src/features/members/components/edit-team-member-form.tsx', import.meta.url),
)
const editFormSource = readFileSync(editFormPath, 'utf8')
const servicePath = fileURLToPath(
  new URL('../../src/features/members/services/team-member.service.ts', import.meta.url),
)
const serviceSource = readFileSync(servicePath, 'utf8')
const updateHookPath = fileURLToPath(
  new URL('../../src/features/members/hooks/use-update-team-member.ts', import.meta.url),
)
const updateHookSource = readFileSync(updateHookPath, 'utf8')
const membersStylesPath = fileURLToPath(new URL('../../src/styles/members.css', import.meta.url))
const newsStylesPath = fileURLToPath(new URL('../../src/styles/news.css', import.meta.url))
const membersStyles = readFileSync(membersStylesPath, 'utf8')
const newsStyles = readFileSync(newsStylesPath, 'utf8')

function normalizeStyleBlock(source, selector) {
  const start = source.indexOf(selector)
  assert.notEqual(start, -1, `style block exists for ${selector}`)
  const end = source.indexOf('}', start)

  return source
    .slice(start, end + 1)
    .replaceAll('team-member-list', 'list')
    .replaceAll('news-list', 'list')
    .replace(/\s+/g, ' ')
    .trim()
}

test('member rows do not navigate to details', () => {
  const row = componentSource.match(/<div\s+className="team-member-list__row"[^>]*>/s)?.[0]

  assert.ok(row, 'member row markup exists')
  assert.doesNotMatch(row, /tabIndex=|onClick=|onKeyDown=/)
})

test('member detail and edit navigation remain available only from row actions', () => {
  assert.match(
    componentSource,
    /onClick=\{\(\) => navigateTo\(ROUTE_PATHS\.MEMBER_DETAIL\.replace\(':id', memberId\)\)\}/,
  )
  assert.match(
    componentSource,
    /onClick=\{\(\) => navigateTo\(ROUTE_PATHS\.MEMBER_EDIT\.replace\(':id', memberId\)\)\}/,
  )
  assert.match(routerSource, /path:\s*ROUTE_PATHS\.MEMBER_EDIT,\s*element:\s*<MemberEditPage\s*\/>/)
})

test('published members lock editable fields until website display is turned off', () => {
  assert.match(editFormSource, /const isFormLocked = savedMember\.isPublished/)
  assert.match(
    editFormSource,
    /\{isFormLocked && \(\s*<div className="team-member-edit__locked-notice">/s,
  )
  assert.match(
    editFormSource,
    /<fieldset className="team-member-edit__editable-fields" disabled=\{isFormLocked\}>/,
  )
  assert.match(
    membersStyles,
    /\.team-member-edit__editable-fields:disabled \{[^}]*pointer-events:\s*none;/s,
  )
})

test('published-to-unpublished asks for confirmation from the status action', () => {
  assert.match(
    editFormSource,
    /if \(savedMember\.isPublished\) \{[\s\S]*?confirmation\.open\(\)/s,
  )
  assert.match(
    editFormSource,
    /async function confirmUnpublish\(\)[\s\S]*?mutateAsync\(\{ isPublished: false \}\)/s,
  )
  assert.doesNotMatch(
    editFormSource,
    /shouldConfirmUnpublish|setPendingPayload|setPendingValues/,
  )
})

test('saving a profile never sends or temporarily changes publish state', () => {
  assert.match(editFormSource, /await updateMutation\.mutateAsync\(buildProfilePayload\(values\)\)/)
  assert.doesNotMatch(editFormSource, /shouldTemporarilyUnpublish/)
  assert.match(editFormSource, /const profileDirty = hasProfileChanges\(watchedValues, savedValues\)/)
})

test('publishing is a separate request and is blocked while profile data is dirty', () => {
  assert.match(editFormSource, /if \(profileDirty\) \{[\s\S]*?Thông tin chỉnh sửa chưa được lưu/s)
  assert.match(editFormSource, /await updateMutation\.mutateAsync\(\{ isPublished: true \}\)/)
  assert.doesNotMatch(editFormSource, /buildProfilePayload\(values\),\s*isPublished/)

  const publishToggle = editFormSource.match(
    /name="isPublished"[\s\S]*?<button[\s\S]*?disabled=\{([^}]+)\}/,
  )?.[1]
  assert.equal(publishToggle, 'employmentStatus === \'Resigned\' || isSaving')
})

test('the save-before-publish message stays beside the publish control', () => {
  const statusCard = editFormSource.match(
    /<aside className="team-member-edit__status-card">[\s\S]*?<\/aside>/,
  )?.[0]

  assert.ok(statusCard, 'status card markup exists')
  assert.match(
    statusCard,
    /team-member-edit__field--publish[\s\S]*?\{errors\.root && <p className="team-member-edit__form-error" role="alert">\{errors\.root\.message\}<\/p>\}/s,
  )
  assert.match(
    membersStyles,
    /\.team-member-edit__field--publish \.team-member-edit__form-error \{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
  )
})

test('a successful save resets the current form from the API response before publishing', () => {
  assert.match(
    editFormSource,
    /async function saveProfile[\s\S]*?mutateAsync\(buildProfilePayload\(values\)\)[\s\S]*?applySuccessfulUpdate\(updatedMember\)/s,
  )
  assert.match(
    editFormSource,
    /function applySuccessfulUpdate\(updatedMember: TeamMemberDetail\)[\s\S]*?setSavedMember\(updatedMember\)[\s\S]*?reset\(getInitialValues\(updatedMember\)\)/s,
  )
})

test('leaving an unpublished dirty form asks before discarding changes', () => {
  assert.match(editFormSource, /function navigateAway\(destination: string[\s\S]*?\)/)
  assert.match(editFormSource, /if \(profileDirty\) \{[\s\S]*?leaveConfirmation\.open\(\)/s)
  assert.match(editFormSource, /Thông tin chưa được lưu có thể bị mất/)
})

test('update service keeps profile and publish payloads mutually exclusive', () => {
  assert.match(
    serviceSource,
    /if \('isPublished' in payload\) \{\s*formData\.append\('isPublished', String\(payload\.isPublished\)\)\s*return formData\s*\}/s,
  )
  assert.doesNotMatch(serviceSource, /if \(!\('fullName' in payload\)\)/)
  assert.doesNotMatch(
    serviceSource,
    /if \(payload\.isPublished !== undefined\)[\s\S]*formData\.append\('isPublished'/s,
  )
})

test('successful profile save releases the status action before background refetch completes', () => {
  assert.doesNotMatch(updateHookSource, /onSuccess:\s*async\s*\(\)/)
  assert.match(updateHookSource, /onSuccess:\s*\(\)\s*=>\s*\{[\s\S]*queryClient\.invalidateQueries/s)
})

test('member row action menu uses the news menu styling tokens', () => {
  const stylePairs = [
    ['.team-member-list__row-actions-separator', '.news-list__row-actions-separator'],
    [
      '.team-member-list__row-actions-menu button.team-member-list__row-actions-danger',
      '.news-list__row-actions-menu button.news-list__row-actions-danger',
    ],
    [
      '.team-member-list__row-actions-menu button.team-member-list__row-actions-danger:hover',
      '.news-list__row-actions-menu button.news-list__row-actions-danger:hover',
    ],
    [
      '.team-member-list__row-actions-menu button.team-member-list__row-actions-danger:disabled',
      '.news-list__row-actions-menu button.news-list__row-actions-danger:disabled',
    ],
  ]

  for (const [memberSelector, newsSelector] of stylePairs) {
    assert.equal(normalizeStyleBlock(membersStyles, memberSelector), normalizeStyleBlock(newsStyles, newsSelector))
  }
})
