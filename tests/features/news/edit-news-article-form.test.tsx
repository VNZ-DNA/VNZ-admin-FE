import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditNewsArticleForm } from '@/features/news/components/edit-news-article-form'
import { newsService } from '@/features/news/services/news.service'
import type { NewsArticleDetail } from '@/features/news/types'
import { api } from '@/lib/http/axios'

const article: NewsArticleDetail = {
  id: 'news-id', title: 'Tiêu đề VI', summary: '<p>Mô tả VI</p>', content: `<p>${'v'.repeat(300)}</p>`,
  imageUrl: null, authorName: 'Admin', createdAt: '2026-10-01', updatedAt: '2026-10-01',
  updatedAtUtc: '2026-10-01T08:30:15.123456+00:00', publishAt: null, status: 'Draft',
  categories: [{ id: 'category-id', name: 'PRODUCT' }],
  translations: { en: { title: 'English title', summary: '<p>English summary</p>', content: `<p>${'e'.repeat(300)}</p>` } },
  actions: ['Edit', 'Publish'],
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function renderEdit() {
  vi.spyOn(newsService, 'getNewsCategories').mockResolvedValue(article.categories)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><EditNewsArticleForm id={article.id} /></MemoryRouter></QueryClientProvider>)
  return client
}

function apiError(status: number, code: string, fields: string[] = []) {
  return { isAxiosError: true, response: { status, data: { message: 'Dữ liệu chưa hợp lệ.', errors: { code, fields } } } }
}

function titleInput() {
  return screen.getByRole('textbox', { name: /^Tiêu đề bài viết/ }) as HTMLInputElement
}

function editRichText(name: string, html: string) {
  const editor = screen.getByRole('textbox', { name })
  editor.innerHTML = html
  fireEvent.input(editor)
}

describe('Admin news bilingual edit', () => {
  it('preserves both languages while switching tabs and saves the full pair with the exact token', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(article)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    renderEdit()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'VI đang soạn' } })
    editRichText('Nội dung bài viết', '<p>VI mới</p>')
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))
    expect(titleInput().value).toBe('English title')
    fireEvent.change(titleInput(), { target: { value: 'EN đang soạn' } })
    editRichText('Nội dung bài viết', '<p>EN mới</p>')
    fireEvent.click(screen.getByRole('tab', { name: 'Tiếng Việt' }))
    expect(titleInput().value).toBe('VI đang soạn')
    expect(screen.getByRole('textbox', { name: 'Nội dung bài viết' }).innerHTML).toBe('<p>VI mới</p>')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(article.id, expect.objectContaining({
      title: 'VI đang soạn', content: '<p>VI mới</p>', status: 'Draft', categoryIds: ['category-id'],
      translations: { en: { title: 'EN đang soạn', summary: '<p>English summary</p>', content: '<p>EN mới</p>' } },
      expectedUpdatedAt: article.updatedAtUtc,
    })))
  })

  it('allows an empty Draft without inventing a token or requiring EN', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue({ ...article, title: null, summary: null, content: null, categories: [], translations: null, updatedAtUtc: null })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    renderEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(article.id, expect.objectContaining({
      title: null, summary: null, content: null, categoryIds: [], expectedUpdatedAt: null,
      translations: { en: { title: null, summary: null, content: null } }, status: 'Draft',
    })))
  })

  it('blocks Publish and selects EN when its required fields are missing', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue({ ...article, translations: null })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    renderEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Đăng bài viết' }))
    const enTab = await screen.findByRole('tab', { name: 'English (có lỗi)' })
    expect(enTab.getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Vui lòng nhập tiêu đề bài viết trước khi đăng.')).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
  })

  it('saves Published as Published with both languages and cannot downgrade it to Draft', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue({ ...article, status: 'Published', actions: ['Edit', 'Close'] })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    renderEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(article.id, expect.objectContaining({ status: 'Published', translations: article.translations })))
    expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull()
  })

  it('maps nested Backend field paths to the EN tab and field error', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(article)
    vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(400, 'BILINGUAL_SCHEMA_INVALID', ['$.translations.en.content']))
    renderEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu bản nháp' }))
    const tab = await screen.findByRole('tab', { name: 'English (có lỗi)' })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('textbox', { name: 'Nội dung bài viết' }).closest('[data-invalid]')).toBeTruthy()
  })

  it('keeps the draft on background refetch and still submits its original token', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(article)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    const client = renderEdit()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'Bản đang soạn' } })
    client.setQueryData(['news-article', article.id], { ...article, title: 'Bản máy chủ', updatedAt: '2026-10-05', updatedAtUtc: 'new-token', status: 'Closed', actions: [] })
    await waitFor(() => expect(titleInput().value).toBe('Bản đang soạn'))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(article.id, expect.objectContaining({ title: 'Bản đang soạn', expectedUpdatedAt: article.updatedAtUtc })))
  })

  it('preserves the draft during conflict recovery and requires an explicit choice before another save', async () => {
    const latest = { ...article, title: 'Bản máy chủ mới', updatedAtUtc: '2026-10-05T08:30:15.654321+00:00' }
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValueOnce(article).mockRejectedValueOnce(new Error('Network')).mockResolvedValue(latest)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderEdit()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'Bản tôi đang soạn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    const reload = await screen.findByRole('button', { name: 'Tải bản mới để đối chiếu' })
    expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reload)
    await screen.findByText('Không thể tải bản mới. Nội dung đang soạn vẫn được giữ nguyên.')
    expect(titleInput().value).toBe('Bản tôi đang soạn')
    fireEvent.click(screen.getByRole('button', { name: 'Tải bản mới để đối chiếu' }))
    await screen.findByText('Bản máy chủ mới')
    expect(titleInput().value).toBe('Bản tôi đang soạn')
    expect(update).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Giữ nội dung đang soạn' }))
    expect(titleInput().value).toBe('Bản tôi đang soạn')
    expect(update).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update).toHaveBeenLastCalledWith(article.id, expect.objectContaining({ title: 'Bản tôi đang soạn', expectedUpdatedAt: latest.updatedAtUtc }))
  })

  it('does not allow resaving a conflict when the latest version is Closed', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValueOnce(article).mockResolvedValue({ ...article, status: 'Closed', actions: [] })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderEdit()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu bản nháp' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tải bản mới để đối chiếu' }))
    await screen.findByText('Bản mới không còn cho phép chỉnh sửa. Nội dung đang soạn vẫn được giữ để đối chiếu.')
    expect(screen.queryByRole('button', { name: 'Giữ nội dung đang soạn' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('explicitly replaces the draft with both server languages without automatically saving', async () => {
    const latest = { ...article, title: 'VI mới trên máy chủ', status: 'Published', actions: ['Edit', 'Close'] as NewsArticleDetail['actions'], updatedAtUtc: '2026-10-05T08:30:15.654321+00:00',
      translations: { en: { ...article.translations?.en, title: 'New server EN' } } }
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValueOnce(article).mockResolvedValue(latest)
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(apiError(409, 'CONTENT_CONFLICT'))
    renderEdit()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'Bản đang soạn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tải bản mới để đối chiếu' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Dùng bản mới' }))
    expect(titleInput().value).toBe('VI mới trên máy chủ')
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))
    expect(titleInput().value).toBe('New server EN')
    expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull()
    expect(update).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(update).toHaveBeenLastCalledWith(article.id, expect.objectContaining({
      title: latest.title, translations: latest.translations, status: 'Published', expectedUpdatedAt: latest.updatedAtUtc,
    })))
  })

  it('sends dot-path multipart fields for both languages and keeps image-only Draft content', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue(article)
    const put = vi.spyOn(api, 'put').mockRejectedValue(new Error('Network'))
    renderEdit()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    editRichText('Nội dung bài viết', '<p><img src="https://example.com/image.jpg" alt="Ảnh" /></p>')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    const [url, body] = put.mock.calls[0]
    expect(url).toBe('/api/v1/admin/news/news-id')
    const formData = body as FormData
    expect(formData.get('expectedUpdatedAt')).toBe('2026-10-01T08:30:15.123456+00:00')
    expect(formData.get('title')).toBe('Tiêu đề VI')
    expect(formData.get('summary')).toBe('<p>Mô tả VI</p>')
    expect(String(formData.get('content'))).toContain('<img')
    expect(formData.get('translations.en.title')).toBe('English title')
    expect(formData.get('translations.en.summary')).toBe('<p>English summary</p>')
    expect(formData.get('translations.en.content')).toBe(`<p>${'e'.repeat(300)}</p>`)
    expect(formData.getAll('categoryIds')).toEqual(['category-id'])
    expect(formData.get('status')).toBe('Draft')
    expect(formData.has('image')).toBe(false)
    expect(formData.has('action')).toBe(false)
  })

  it('keeps a Closed article read-only on initial load', async () => {
    vi.spyOn(newsService, 'getNewsArticleDetail').mockResolvedValue({ ...article, status: 'Closed', actions: [] })
    const update = vi.spyOn(newsService, 'updateNewsArticle').mockRejectedValue(new Error('Network'))
    renderEdit()
    await screen.findByRole('heading', { name: 'Không thể chỉnh sửa bài viết' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(update).not.toHaveBeenCalled()
  })
})
