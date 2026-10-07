import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NewsArticleList } from '@/features/news/components/news-article-list'
import { JobPostList } from '@/features/careers/components/job-post-list'
import { api } from '@/lib/http/axios'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

const lists = [
  { name: 'News', Component: NewsArticleList, endpoint: '/api/v1/admin/news', column: 'Ngày tạo', field: 'createdAt', code: 'NEWS_QUERY_INVALID', item: { id: 'news-1', title: 'Bài viết mẫu', authorName: 'Admin', createdAt: '2026-10-05T01:00:00+00:00', publishAt: null, categories: [], status: 'Bản nháp' } },
  { name: 'JobPost', Component: JobPostList, endpoint: '/api/v1/admin/job-posts', column: 'Ngày hết hạn', field: 'expiredDate', code: 'JOB_POST_INVALID_EXPIRED_DATE_FILTER', item: { id: 'job-1', title: 'Tin tuyển dụng mẫu', shortDescription: null, expiredDate: '2030-10-31', numberOfPositions: 1, pendingApplicationCount: 0, status: 'Bản nháp' } },
]

describe.each(lists)('$name date sorting', ({ Component, endpoint, column, field, code, item }) => {
  function setup(rejectSort = false, emptySort = false) {
    const requests: URLSearchParams[] = []
    vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
      if (url !== endpoint) return { data: { isSuccess: true, data: [] } }
      const query = new URLSearchParams(config?.params as URLSearchParams)
      requests.push(query)
      if (rejectSort && query.has(field)) throw { isAxiosError: true, response: { status: 400, data: { message: 'Hướng sắp xếp không hợp lệ.', errors: { code, fields: [field] } } } }
      const empty = emptySort && query.has(field)
      return { data: { isSuccess: true, data: { items: empty ? [] : [item], page: Number(query.get('page')), pageSize: 20, total: empty ? 0 : 40, totalItems: empty ? 0 : 40, totalPages: empty ? 0 : 2 } } }
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>)
    return requests
  }

  it('sends sort directions, resets pagination and removes a repeated selection', async () => {
    const requests = setup()
    await screen.findByText(item.title)
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(requests.at(-1)?.get('page')).toBe('2'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trang sau' }).hasAttribute('disabled')).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
    await waitFor(() => expect(requests.at(-1)?.get(field)).toBe('asc'))
    expect(requests.at(-1)?.get('page')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Giảm dần' }))
    await waitFor(() => expect(requests.at(-1)?.get(field)).toBe('desc'))
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    expect(screen.getByRole('menuitemradio', { name: 'Giảm dần' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Giảm dần' }))
    await waitFor(() => expect(screen.getByRole('columnheader', { name: new RegExp(column) }).getAttribute('aria-sort')).toBe('none'))
  })

  it('keeps the column controls on a field error and lets the user remove the rejected sort', async () => {
    setup(true)
    await screen.findByText(item.title)
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('Hướng sắp xếp không hợp lệ.')
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(screen.getByText(item.title)).toBeTruthy()
  })

  it('keeps sort controls available when the list becomes empty', async () => {
    setup(false, true)
    await screen.findByText(item.title)
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
    await waitFor(() => expect(screen.queryByText(item.title)).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: `Sắp xếp ${column}` }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
    await screen.findByText(item.title)
  })
})

it('preserves both News sort fields independently and serializes existing filters', async () => {
  const requests: URLSearchParams[] = []
  vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    if (url !== '/api/v1/admin/news') return { data: { isSuccess: true, data: [] } }
    requests.push(new URLSearchParams(config?.params as URLSearchParams))
    return { data: { isSuccess: true, data: { items: [lists[0].item], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } } }
  })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><NewsArticleList /></MemoryRouter></QueryClientProvider>)
  await screen.findByText(lists[0].item.title)
  fireEvent.click(screen.getByRole('button', { name: 'Trạng thái' }))
  fireEvent.click(screen.getByRole('option', { name: 'Bản nháp' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp Ngày tạo' }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Giảm dần' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp Ngày đăng' }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tăng dần' }))
  await waitFor(() => expect(requests.at(-1)?.get('publishAt')).toBe('asc'))
  expect(requests.at(-1)?.get('createdAt')).toBe('desc')
  expect(requests.at(-1)?.getAll('status')).toEqual(['Draft'])
  fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp Ngày tạo' }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Giảm dần' }))
  await waitFor(() => expect(requests.at(-1)?.has('createdAt')).toBe(false))
  expect(requests.at(-1)?.get('publishAt')).toBe('asc')
})
