import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CreateNewsArticleForm } from '@/features/news/components/create-news-article-form'
import { newsService } from '@/features/news/services/news.service'

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { fullName: 'Admin' } }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderCreate() {
  vi.spyOn(newsService, 'getNewsCategories').mockResolvedValue([{ id: 'category-id', name: 'PRODUCT' }])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><CreateNewsArticleForm /></MemoryRouter></QueryClientProvider>)
}

function titleInput() {
  return screen.getByRole('textbox', { name: /^Tiêu đề bài viết/ }) as HTMLInputElement
}

function editRichText(name: string, html: string) {
  const editor = screen.getByRole('textbox', { name })
  editor.innerHTML = html
  fireEvent.input(editor)
}

function apiError(status: number, code: string, fields: string[] = []) {
  return { isAxiosError: true, response: { status, data: { message: 'Dữ liệu chưa hợp lệ.', errors: { code, fields } } } }
}

describe('Admin news bilingual create', () => {
  it('preserves VI and EN while switching tabs and sends both languages in a Draft', async () => {
    const create = vi.spyOn(newsService, 'createNewsArticle').mockRejectedValue(new Error('Network'))
    renderCreate()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'Tiêu đề VI' } })
    editRichText('Nội dung bài viết', '<p>Nội dung VI</p>')
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))
    fireEvent.change(titleInput(), { target: { value: 'English title' } })
    editRichText('Nội dung bài viết', '<p>English content</p>')
    fireEvent.click(screen.getByRole('tab', { name: 'Tiếng Việt' }))
    expect(titleInput().value).toBe('Tiêu đề VI')
    expect(screen.getByRole('textbox', { name: 'Nội dung bài viết' }).innerHTML).toBe('<p>Nội dung VI</p>')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith({
      title: 'Tiêu đề VI', summary: null, content: '<p>Nội dung VI</p>', categoryIds: [], status: 'Draft', image: null,
      translations: { en: { title: 'English title', summary: null, content: '<p>English content</p>' } },
    }, expect.any(Object)))
  })

  it('allows a partially empty Draft and does not require an EN title', async () => {
    const create = vi.spyOn(newsService, 'createNewsArticle').mockRejectedValue(new Error('Network'))
    renderCreate()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.click(screen.getByRole('tab', { name: 'English' }))
    editRichText('Mô tả ngắn', '<p>EN draft summary</p>')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      title: null, summary: null, content: null, status: 'Draft',
      translations: { en: { title: null, summary: '<p>EN draft summary</p>', content: null } },
    }), expect.any(Object)))
  })

  it('blocks Publish and selects EN when a required bilingual field is missing', async () => {
    const create = vi.spyOn(newsService, 'createNewsArticle').mockRejectedValue(new Error('Network'))
    renderCreate()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.change(titleInput(), { target: { value: 'Tiêu đề VI' } })
    editRichText('Mô tả ngắn', '<p>Mô tả VI</p>')
    editRichText('Nội dung bài viết', `<p>${'v'.repeat(300)}</p>`)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Đăng bài viết' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Chọn thể loại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sản phẩm' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Đăng bài viết' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Đăng bài viết' }))
    const enTab = await screen.findByRole('tab', { name: 'English (có lỗi)' })
    expect(enTab.getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Vui lòng nhập tiêu đề bài viết trước khi đăng.')).toBeTruthy()
    expect(create).not.toHaveBeenCalled()
  })

  it('maps a Backend nested EN error to the EN tab without losing the draft', async () => {
    vi.spyOn(newsService, 'createNewsArticle').mockRejectedValue(apiError(400, 'BILINGUAL_SCHEMA_INVALID', ['$.translations.en.content']))
    renderCreate()
    await screen.findByRole('textbox', { name: /^Tiêu đề bài viết/ })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    const enTab = await screen.findByRole('tab', { name: 'English (có lỗi)' })
    expect(enTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('textbox', { name: 'Nội dung bài viết' }).closest('[data-invalid]')).toBeTruthy()
  })
})
