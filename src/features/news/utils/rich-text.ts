export function richTextToPlainText(html: string): string {
  if (!html) return ''

  if (typeof document !== 'undefined') {
    const element = document.createElement('div')
    element.innerHTML = html
    return element.textContent ?? ''
  }

  return html.replace(/<[^>]*>/g, ' ')
}

export function hasRichTextContent(html: string): boolean {
  return richTextToPlainText(html).trim().length > 0
}

export function countRichTextCharacters(html: string): number {
  return richTextToPlainText(html).replace(/\s/g, '').length
}

export function nullableRichText(html: string): string | null {
  return hasRichTextContent(html) ? html.trim() : null
}