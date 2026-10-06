type RichTextContentProps = {
  html: string | null
  className?: string
  fallback?: string
}

export function RichTextContent({ html, className = '', fallback = '—' }: RichTextContentProps) {
  if (!html) {
    return <div className={className}>{fallback}</div>
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}