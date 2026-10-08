import {
  Bold,
  ImagePlus,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { newsService } from '@/features/news/services/news.service'
import { NEWS_IMAGE_ACCEPT, validateNewsImage } from '@/features/news/utils/news-media'
import { getApiErrorMessage } from '@/lib/http/rate-limit'

type RichTextEditorVariant = 'summary' | 'content'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  variant: RichTextEditorVariant
  placeholder: string
  disabled?: boolean
  ariaLabel: string
  allowMedia?: boolean
  httpsOnly?: boolean
}

type MediaMode = 'single' | 'gallery'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeLink(value: string, httpsOnly = false): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (httpsOnly) return /^https:\/\//i.test(trimmed) ? trimmed : null
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(trimmed)) return `https://${trimmed}`
  return null
}

export function RichTextEditor({
  value,
  onChange,
  variant,
  placeholder,
  disabled = false,
  ariaLabel,
  allowMedia = false,
  httpsOnly = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const [mediaMode, setMediaMode] = useState<MediaMode | null>(null)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaAlts, setMediaAlts] = useState(['', ''])
  const [mediaCaption, setMediaCaption] = useState('')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editor.innerHTML === value) return
    editor.innerHTML = value
  }, [value])

  function emitChange() {
    onChange(editorRef.current?.innerHTML ?? '')
  }

  function rememberSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange()
    }
  }

  function restoreSelection() {
    const range = selectionRef.current
    if (!range) return

    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function runCommand(command: string, commandValue?: string) {
    if (disabled) return
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, commandValue)
    rememberSelection()
    emitChange()
  }

  function openMedia(mode: MediaMode) {
    rememberSelection()
    setMediaMode(mode)
    setMediaFiles([])
    setMediaAlts(['', ''])
    setMediaCaption('')
    setMediaError(null)
  }

  function closeMedia() {
    if (isUploadingMedia) return
    setMediaMode(null)
    setMediaFiles([])
    setMediaError(null)
  }

  function onMediaFilesChange(files: File[]) {
    const requiredCount = mediaMode === 'gallery' ? 2 : 1
    if (files.length !== requiredCount) {
      setMediaError(mediaMode === 'gallery' ? 'Gallery cần đúng 2 ảnh.' : 'Vui lòng chọn đúng 1 ảnh.')
      setMediaFiles([])
      return
    }

    for (const file of files) {
      const error = validateNewsImage(file)
      if (error) {
        setMediaError(error)
        setMediaFiles([])
        return
      }
    }

    setMediaError(null)
    setMediaFiles(files)
  }

  async function insertMedia() {
    if (!mediaMode || disabled || isUploadingMedia) return

    const requiredCount = mediaMode === 'gallery' ? 2 : 1
    if (mediaFiles.length !== requiredCount) {
      setMediaError(mediaMode === 'gallery' ? 'Gallery cần đúng 2 ảnh.' : 'Vui lòng chọn 1 ảnh.')
      return
    }

    try {
      setIsUploadingMedia(true)
      setMediaError(null)
      const uploaded = []
      for (const file of mediaFiles) {
        uploaded.push(await newsService.uploadContentImage(file))
      }
      const caption = mediaCaption.trim()
      const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''

      const html = mediaMode === 'single'
        ? `<figure class="news-image"><img src="${escapeHtml(uploaded[0].url)}" alt="${escapeHtml(mediaAlts[0].trim())}">${captionHtml}</figure>`
        : `<figure class="news-gallery"><div class="news-gallery-images"><img src="${escapeHtml(uploaded[0].url)}" alt="${escapeHtml(mediaAlts[0].trim())}"><img src="${escapeHtml(uploaded[1].url)}" alt="${escapeHtml(mediaAlts[1].trim())}"></div>${captionHtml}</figure>`

      editorRef.current?.focus()
      restoreSelection()
      document.execCommand('insertHTML', false, `${html}<p><br></p>`)
      rememberSelection()
      emitChange()
      setMediaMode(null)
      setMediaFiles([])
      setMediaAlts(['', ''])
      setMediaCaption('')
      setMediaError(null)
    } catch (error: unknown) {
      setMediaError(getApiErrorMessage(error, 'Không thể tải ảnh nội dung lên hệ thống. Vui lòng thử lại.'))
    } finally {
      setIsUploadingMedia(false)
    }
  }

  function createLink() {
    if (disabled) return
    const requestedUrl = window.prompt('Nhập liên kết (https://... hoặc email):')
    if (requestedUrl === null) return

    const href = normalizeLink(requestedUrl, httpsOnly)
    if (!href) {
      window.alert(
        httpsOnly
          ? 'Liên kết chưa hợp lệ. Vui lòng dùng URL HTTPS.'
          : 'Liên kết chưa hợp lệ. Vui lòng dùng URL http/https hoặc địa chỉ email.',
      )
      return
    }

    runCommand('createLink', href)
  }

  const isContent = variant === 'content'

  return (
    <div className={`news-rich-editor news-rich-editor--${variant} ${disabled ? 'is-disabled' : ''}`}>
      <div className="news-rich-editor__toolbar" role="toolbar" aria-label={`Định dạng ${ariaLabel}`}>
        {isContent && (
          <>
            <button type="button" disabled={disabled} onClick={() => runCommand('formatBlock', 'p')}>P</button>
            <button type="button" disabled={disabled} onClick={() => runCommand('formatBlock', 'h2')}>H2</button>
            <button type="button" disabled={disabled} onClick={() => runCommand('formatBlock', 'h3')}>H3</button>
            <span className="news-rich-editor__divider" aria-hidden="true" />
          </>
        )}

        {isContent && allowMedia && (
          <>
            <span className="news-rich-editor__divider" aria-hidden="true" />
            <button type="button" disabled={disabled} aria-label="Chèn ảnh" title="Chèn ảnh" onClick={() => openMedia('single')}>
              <ImagePlus size={15} aria-hidden="true" />
            </button>
            <button type="button" disabled={disabled} aria-label="Chèn gallery 2 ảnh" title="Chèn gallery 2 ảnh" onClick={() => openMedia('gallery')}>
              <Images size={15} aria-hidden="true" />
            </button>
          </>
        )}

        <button type="button" disabled={disabled} aria-label="In đậm" title="In đậm" onClick={() => runCommand('bold')}>
          <Bold size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="In nghiêng" title="In nghiêng" onClick={() => runCommand('italic')}>
          <Italic size={15} aria-hidden="true" />
        </button>

        {isContent && (
          <>
            <button type="button" disabled={disabled} aria-label="Gạch chân" title="Gạch chân" onClick={() => runCommand('underline')}>
              <Underline size={15} aria-hidden="true" />
            </button>
            <button type="button" disabled={disabled} aria-label="Gạch ngang" title="Gạch ngang" onClick={() => runCommand('strikeThrough')}>
              <Strikethrough size={15} aria-hidden="true" />
            </button>
            <span className="news-rich-editor__divider" aria-hidden="true" />
            <button type="button" disabled={disabled} aria-label="Danh sách dấu chấm" title="Danh sách dấu chấm" onClick={() => runCommand('insertUnorderedList')}>
              <List size={15} aria-hidden="true" />
            </button>
            <button type="button" disabled={disabled} aria-label="Danh sách đánh số" title="Danh sách đánh số" onClick={() => runCommand('insertOrderedList')}>
              <ListOrdered size={15} aria-hidden="true" />
            </button>
            <button type="button" disabled={disabled} aria-label="Trích dẫn" title="Trích dẫn" onClick={() => runCommand('formatBlock', 'blockquote')}>
              <Quote size={15} aria-hidden="true" />
            </button>
          </>
        )}

        <span className="news-rich-editor__divider" aria-hidden="true" />
        <button type="button" disabled={disabled} aria-label="Thêm liên kết" title="Thêm liên kết" onClick={createLink}>
          <Link2 size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Bỏ liên kết" title="Bỏ liên kết" onClick={() => runCommand('unlink')}>
          <Unlink size={15} aria-hidden="true" />
        </button>

        {isContent && (
          <>
            <span className="news-rich-editor__divider" aria-hidden="true" />
            <button type="button" disabled={disabled} aria-label="Hoàn tác" title="Hoàn tác" onClick={() => runCommand('undo')}>
              <Undo2 size={15} aria-hidden="true" />
            </button>
            <button type="button" disabled={disabled} aria-label="Làm lại" title="Làm lại" onClick={() => runCommand('redo')}>
              <Redo2 size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {mediaMode && (
        <div className="news-rich-editor__media-panel">
          <div className="news-rich-editor__media-heading">
            <strong>{mediaMode === 'gallery' ? 'Chèn gallery 2 ảnh' : 'Chèn ảnh đơn'}</strong>
            <span>Ảnh sẽ được upload trước rồi chèn vào nội dung.</span>
          </div>

          <label className="news-rich-editor__media-file">
            <span>{mediaMode === 'gallery' ? 'Chọn đúng 2 ảnh' : 'Chọn 1 ảnh'}</span>
            <input
              type="file"
              accept={NEWS_IMAGE_ACCEPT}
              multiple={mediaMode === 'gallery'}
              disabled={isUploadingMedia}
              onChange={(event) => onMediaFilesChange(Array.from(event.currentTarget.files ?? []))}
            />
          </label>

          <div className="news-rich-editor__media-fields">
            <label>
              <span>Alt ảnh 1</span>
              <input value={mediaAlts[0]} disabled={isUploadingMedia} onChange={(event) => setMediaAlts((current) => [event.target.value, current[1]])} />
            </label>
            {mediaMode === 'gallery' && (
              <label>
                <span>Alt ảnh 2</span>
                <input value={mediaAlts[1]} disabled={isUploadingMedia} onChange={(event) => setMediaAlts(([first]) => [first, event.target.value])} />
              </label>
            )}
            <label className="news-rich-editor__media-caption">
              <span>Chú thích (tùy chọn)</span>
              <input value={mediaCaption} disabled={isUploadingMedia} onChange={(event) => setMediaCaption(event.target.value)} />
            </label>
          </div>

          {mediaError && <p className="news-rich-editor__media-error" role="alert">{mediaError}</p>}

          <div className="news-rich-editor__media-actions">
            <button type="button" disabled={isUploadingMedia} onClick={closeMedia}>Hủy</button>
            <button type="button" disabled={isUploadingMedia} onClick={() => void insertMedia()}>
              {isUploadingMedia ? 'Đang tải...' : 'Chèn vào nội dung'}
            </button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="news-rich-editor__surface"
        contentEditable={!disabled}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={emitChange}
        onSelect={rememberSelection}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onBlur={emitChange}
      />
    </div>
  )
}
