import {
  Bold,
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
import { useEffect, useRef } from 'react'

import { CONTACT_REPLY_RICH_TEXT_MAX_LENGTH } from '@/features/contacts/schemas/contact-reply.schema'

type ContactEmailRichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder: string
  ariaLabel: string
  disabled?: boolean
}

function normalizeHttpsLink(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function ContactEmailRichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  ariaLabel,
  disabled = false,
}: ContactEmailRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)

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

  function createLink() {
    if (disabled) return
    rememberSelection()
    const requestedUrl = window.prompt('Nhập liên kết HTTPS:')
    if (requestedUrl === null) return

    const href = normalizeHttpsLink(requestedUrl)
    if (!href) {
      window.alert('Liên kết chưa hợp lệ. Vui lòng nhập URL bắt đầu bằng https://')
      return
    }

    runCommand('createLink', href)
  }

  const isOverLimit = value.length > CONTACT_REPLY_RICH_TEXT_MAX_LENGTH

  return (
    <div className={`contact-rich-editor ${disabled ? 'is-disabled' : ''} ${isOverLimit ? 'is-over-limit' : ''}`}>
      <div className="contact-rich-editor__toolbar" role="toolbar" aria-label={`Định dạng ${ariaLabel}`}>
        <button type="button" disabled={disabled} title="Đoạn văn" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'p')}>
          P
        </button>
        <span className="contact-rich-editor__divider" aria-hidden="true" />
        <button type="button" disabled={disabled} aria-label="In đậm" title="In đậm" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}>
          <Bold size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="In nghiêng" title="In nghiêng" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}>
          <Italic size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Gạch chân" title="Gạch chân" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('underline')}>
          <Underline size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Gạch ngang" title="Gạch ngang" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('strikeThrough')}>
          <Strikethrough size={15} aria-hidden="true" />
        </button>
        <span className="contact-rich-editor__divider" aria-hidden="true" />
        <button type="button" disabled={disabled} aria-label="Danh sách dấu chấm" title="Danh sách dấu chấm" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}>
          <List size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Danh sách đánh số" title="Danh sách đánh số" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')}>
          <ListOrdered size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Trích dẫn" title="Trích dẫn" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('formatBlock', 'blockquote')}>
          <Quote size={15} aria-hidden="true" />
        </button>
        <span className="contact-rich-editor__divider" aria-hidden="true" />
        <button type="button" disabled={disabled} aria-label="Thêm liên kết" title="Thêm liên kết HTTPS" onMouseDown={(event) => event.preventDefault()} onClick={createLink}>
          <Link2 size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Bỏ liên kết" title="Bỏ liên kết" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('unlink')}>
          <Unlink size={15} aria-hidden="true" />
        </button>
        <span className="contact-rich-editor__divider" aria-hidden="true" />
        <button type="button" disabled={disabled} aria-label="Hoàn tác" title="Hoàn tác" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('undo')}>
          <Undo2 size={15} aria-hidden="true" />
        </button>
        <button type="button" disabled={disabled} aria-label="Làm lại" title="Làm lại" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('redo')}>
          <Redo2 size={15} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={editorRef}
        className="contact-rich-editor__surface"
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
        onBlur={() => {
          emitChange()
          onBlur?.()
        }}
      />

      <div className="contact-rich-editor__meta">
        <span>Chỉ hỗ trợ định dạng an toàn và liên kết HTTPS.</span>
        <span className={isOverLimit ? 'is-over-limit' : ''}>
          {value.length.toLocaleString('vi-VN')} / {CONTACT_REPLY_RICH_TEXT_MAX_LENGTH.toLocaleString('vi-VN')}
        </span>
      </div>
    </div>
  )
}
