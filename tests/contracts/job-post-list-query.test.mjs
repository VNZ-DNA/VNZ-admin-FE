import assert from 'node:assert/strict'
import test from 'node:test'
import { buildJobPostListQuery } from '../../src/features/careers/utils/job-post-list-query.ts'
import { normalizeJobPostListResponse } from '../../src/features/careers/utils/job-post-list-response.ts'
import { isJobPostEditableStatus } from '../../src/features/careers/job-post-status.ts'

test('builds repeated multi-select query values and trims search', () => {
  const query = buildJobPostListQuery({
    search: '  designer  ',
    status: ['Open', 'Closed', 'Open', ' '],
    departmentId: [' dept-1 ', 'dept-2'],
    jobLevel: ['Junior', 'Senior'],
    page: 2,
    pageSize: 15,
  })

  assert.equal(
    query.toString(),
    'search=designer&status=Open&status=Closed&departmentId=dept-1&departmentId=dept-2&jobLevel=Junior&jobLevel=Senior&page=2&pageSize=15',
  )
})

test('omits blank search and empty filter groups', () => {
  const query = buildJobPostListQuery({
    search: '   ',
    status: [],
    departmentId: [' ', ''],
    page: 1,
    pageSize: 20,
  })

  assert.equal(query.toString(), 'page=1&pageSize=20')
})

test('normalizes the finalized success envelope and preserves the legacy envelope', () => {
  assert.equal(normalizeJobPostListResponse({ success: true, data: [] }).isSuccess, true)
  assert.equal(normalizeJobPostListResponse({ isSuccess: true, data: [] }).isSuccess, true)
  assert.equal(normalizeJobPostListResponse({ success: false, data: null }).isSuccess, false)
})

test('allows edit actions only for editable job post statuses', () => {
  assert.equal(isJobPostEditableStatus('Bản nháp'), true)
  assert.equal(isJobPostEditableStatus('Đang tuyển'), true)
  assert.equal(isJobPostEditableStatus('Đã đóng'), false)
  assert.equal(isJobPostEditableStatus('Đã hết hạn'), false)
})
