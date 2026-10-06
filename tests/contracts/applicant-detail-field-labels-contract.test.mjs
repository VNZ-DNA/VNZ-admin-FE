import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const component = readFileSync(
  new URL('../../src/features/applicants/components/applicant-detail.tsx', import.meta.url),
  'utf8',
)

test('applicant detail field labels use the customer detail sentence case', () => {
  for (const label of [
    'Họ và tên',
    'Email',
    'Điện thoại / Zalo',
    'Năm tốt nghiệp',
    'Trường',
    'Chuyên ngành',
    'Portfolio / GitHub / LinkedIn',
    'Giới thiệu về bạn',
    'Thời gian có thể tham gia',
    'Có thể bắt đầu',
    'Biết tin tuyển dụng qua',
  ]) {
    assert.match(component, new RegExp(`<span>${label}</span>`))
  }

  assert.doesNotMatch(component, /<span>HỌ VÀ TÊN<\/span>/)
  assert.match(component, /<span>BỘ PHẬN<\/span>/)
})
