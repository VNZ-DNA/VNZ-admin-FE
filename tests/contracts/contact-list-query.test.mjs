import test from 'node:test'
import assert from 'node:assert/strict'

import { createContactListQueryParams } from '../../src/features/contacts/utils/contact-list-query.ts'

test('contact list query repeats status and read filters while preserving pagination', () => {
  const params = createContactListQueryParams({
    search: '  Jane Doe  ',
    status: ['Chưa liên hệ', 'Đã liên hệ'],
    isRead: [false, true],
    page: 2,
    pageSize: 35,
  })

  assert.deepEqual([...params.entries()], [
    ['search', 'Jane Doe'],
    ['status', 'Chưa liên hệ'],
    ['status', 'Đã liên hệ'],
    ['isRead', 'false'],
    ['isRead', 'true'],
    ['page', '2'],
    ['pageSize', '35'],
  ])
})

test('contact list query omits empty filters', () => {
  const params = createContactListQueryParams({
    search: '  ',
    status: [],
    isRead: [],
    page: 1,
    pageSize: 20,
  })

  assert.deepEqual([...params.entries()], [
    ['page', '1'],
    ['pageSize', '20'],
  ])
})
