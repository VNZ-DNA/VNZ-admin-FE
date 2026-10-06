const PRODUCT_ALLOWED_TAGS = new Set([
  'p',
  'h2',
  'h3',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'br',
])

const PRODUCT_DANGEROUS_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'form',
  'object',
  'embed',
  'svg',
])

const PRODUCT_TAG_ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
}

function isSafeHref(value: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(value.trim())
}

function sanitizeDomNode(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = child as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const normalizedTagName = PRODUCT_TAG_ALIASES[tagName] ?? tagName

    if (PRODUCT_DANGEROUS_TAGS.has(tagName)) {
      element.remove()
      continue
    }

    if (!PRODUCT_ALLOWED_TAGS.has(normalizedTagName)) {
      while (element.firstChild) node.insertBefore(element.firstChild, element)
      element.remove()
      continue
    }

    if (normalizedTagName !== tagName) {
      const replacement = element.ownerDocument.createElement(normalizedTagName)
      while (element.firstChild) replacement.appendChild(element.firstChild)
      element.replaceWith(replacement)
      sanitizeDomNode(replacement)
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      if (normalizedTagName !== 'a' || attribute.name !== 'href' || !isSafeHref(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    }

    sanitizeDomNode(element)
  }
}

function sanitizeWithDomParser(value: string): string {
  const document = new DOMParser().parseFromString('<div></div>', 'text/html')
  const container = document.body.firstElementChild
  if (!container) return ''

  container.innerHTML = value
  sanitizeDomNode(container)
  return container.innerHTML
}

function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function hasRecognizedMarkup(value: string): boolean {
  const tagPattern = /<\/?([a-z][\w:-]*)(?:\s[^>]*)?>/gi
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(value))) {
    const tagName = match[1]?.toLowerCase()
    if (!tagName) continue
    if (PRODUCT_ALLOWED_TAGS.has(tagName) || PRODUCT_DANGEROUS_TAGS.has(tagName) || PRODUCT_TAG_ALIASES[tagName]) return true
    if (!/^<\//.test(match[0]) && new RegExp(`</${tagName}\\s*>`, 'i').test(value)) return true
  }

  return false
}

function sanitizeWithoutDomParser(value: string): string {
  const tagPattern = /<!--[^]*?-->|<\/?([a-z][\w:-]*)([^>]*)>/gi
  const output: string[] = []
  let cursor = 0
  let dangerousTag: string | null = null
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(value))) {
    if (!dangerousTag) output.push(escapeText(value.slice(cursor, match.index)))
    cursor = tagPattern.lastIndex

    const rawTag = match[0]
    const tagName = match[1]?.toLowerCase()
    if (!tagName) continue

    const isClosing = /^<\//.test(rawTag)
    if (dangerousTag) {
      if (isClosing && tagName === dangerousTag) dangerousTag = null
      continue
    }

    if (PRODUCT_DANGEROUS_TAGS.has(tagName)) {
      if (!isClosing) dangerousTag = tagName
      continue
    }

    const normalizedTagName = PRODUCT_TAG_ALIASES[tagName] ?? tagName
    if (!PRODUCT_ALLOWED_TAGS.has(normalizedTagName)) continue
    if (isClosing) {
      output.push(`</${normalizedTagName}>`)
      continue
    }

    if (normalizedTagName === 'br') {
      output.push('<br>')
      continue
    }

    if (normalizedTagName === 'a') {
      const href = match[2]?.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1]
      output.push(href && isSafeHref(href) ? `<a href="${escapeAttribute(href)}">` : '<a>')
      continue
    }

    output.push(`<${normalizedTagName}>`)
  }

  if (!dangerousTag) output.push(escapeText(value.slice(cursor)))
  return output.join('')
}

/**
 * Sanitizes Product block Text while preserving legacy plain-text values.
 * The API must repeat this policy server-side before persistence.
 */
export function sanitizeProductRichText(value: string | null | undefined): string {
  if (!value) return ''
  if (!hasRecognizedMarkup(value)) return escapeText(value)
  if (typeof DOMParser !== 'undefined') return sanitizeWithDomParser(value)
  return sanitizeWithoutDomParser(value)
}
