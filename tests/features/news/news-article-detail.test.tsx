import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NewsArticleDetail } from '@/features/news/components/news-article-detail'
import { newsService } from '@/features/news/services/news.service'
import type { NewsArticleDetail as NewsDetail } from '@/features/news/types'

const article: NewsDetail & { title: string } = {
  id: 'news-id', title: 'Tiêu đề VI', summary: '<p>Mô tả VI</p>', content: '<p>Nội dung VI</p>',
  imageUrl: null, authorName: 'Admin', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01',
  updatedAtUtc: '2026-10-01T08:30:15.123456+00:00', publishAt: null, status: 'Draft',
  categories: [{ id: 'category-id', name: 'PRODUCT' }],
  translations: { en: { title: 'English title', summary: '<p>English summary</p>', content: '<p>English content</p>' } },
  actions: ['Edit', 'Publish'], canDelete: false,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><NewsArticleDetail id={article.id} /></MemoryRouter></QueryClientProvider>)
}

function apiError(status: number, code: string, fields: string[] = []) {
  return { isAxiosError: true, response: { status, data: { message: 'Lỗi dữ liệu', errors: { code, fields } } } }
}

describe('News detail bilingual actions', () => {
  it('shows canonical labels, switches to the invalid tab, and preserves both languages in Publish', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(article)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(400, 'BILINGUAL_CONTENT_REQUIRED', ['translations.en.content']))
    renderDetail()

    await screen.findByRole('heading', { name: article.title })
    expect(screen.getByText('Bản nháp')).toBeTruthy()
    expect(screen.getByText('Sản phẩm')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Đăng' }))
    await screen.findByRole('heading', { name: 'English title' })
    expect(screen.getByRole('tab', { name: 'English (có lỗi)' }).getAttribute('aria-selected')).toBe('true')
    expect(update).toHaveBeenCalledWith(article.id, expect.objectContaining({
      title: article.title, translations: article.translations, expectedUpdatedAt: article.updatedAtUtc, status: 'Published',
    }))
  })

  it('blocks retry on conflict and reloads the new version without automatically writing again', async () => {
    const getDetail = vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValueOnce(article)
      .mockResolvedValue({ ...article, title: 'Tiêu đề mới', updatedAtUtc: '2026-10-05T08:30:15.654321+00:00' })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderDetail()
    await screen.findByRole('heading', { name: article.title })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng' }))
    const reload = await screen.findByRole('button', { name: 'Tải dữ liệu mới' })
    expect((screen.getByRole('button', { name: 'Đăng' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reload)
    await screen.findByRole('heading', { name: 'Tiêu đề mới' })
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(getDetail).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Đăng' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps a failed reload recoverable and does not retry the mutation', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValueOnce(article)
      .mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(article)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderDetail()
    await screen.findByRole('heading', { name: article.title })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tải dữ liệu mới' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))
    await screen.findByRole('heading', { name: article.title })
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('offers conflict recovery inside the Close modal and keeps Close state-only', async () => {
    const published = { ...article, status: 'Published', actions: ['Edit', 'Close'] as NewsDetail['actions'] }
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(published)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderDetail()
    await screen.findByRole('heading', { name: article.title })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Đóng bài viết' }))
    const reload = await screen.findByRole('button', { name: 'Tải dữ liệu mới' })
    expect(update).toHaveBeenCalledWith(article.id, { status: 'Closed', expectedUpdatedAt: article.updatedAtUtc })
    expect((screen.getByRole('button', { name: 'Đóng bài viết' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reload)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(update).toHaveBeenCalledTimes(1)
  })
})
