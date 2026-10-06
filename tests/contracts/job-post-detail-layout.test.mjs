import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(new URL('../../src/features/careers/components/job-post-detail.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../src/styles/careers.css', import.meta.url), 'utf8')

test('job detail places actions before the article and fixed-width metadata column', () => {
  const toolbarIndex = component.lastIndexOf('className="job-post-detail__toolbar"')
  const layoutIndex = component.lastIndexOf('className="job-post-detail__layout"')
  const infoCardIndex = component.lastIndexOf('className="job-post-detail__info-card"')
  const statusIndex = component.lastIndexOf('job-post-detail__status job-post-detail__status--${statusClassName}')

  assert.notEqual(toolbarIndex, -1)
  assert.notEqual(layoutIndex, -1)
  assert.notEqual(infoCardIndex, -1)
  assert.notEqual(statusIndex, -1)
  assert.ok(toolbarIndex < layoutIndex)
  assert.ok(statusIndex > infoCardIndex)
  assert.match(component, /className="job-post-detail__article-card"/)
  assert.match(component, /className="job-post-detail__info-card"/)
})

test('job detail uses the news detail metadata width and spacing', () => {
  assert.match(styles, /\.job-post-detail__info-card\s*\{[^}]*width:\s*240px/s)
  assert.match(styles, /\.job-post-detail__info-list\s*\{[^}]*gap:\s*10px/s)
  assert.match(styles, /\.job-post-detail__info-list\s*>\s*div\s*\{[^}]*grid-template-columns:\s*82px\s+minmax\(0,\s*1fr\)/s)
})

test('job detail loading state uses the same two-column frame', () => {
  assert.match(component, /job-post-detail__layout[\s\S]*job-post-detail__skeleton-content[\s\S]*job-post-detail__skeleton-info/)
  assert.match(styles, /\.job-post-detail__article-content\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.75/s)
})

test('job detail uses the shared bilingual content card for VI and EN', () => {
  assert.match(component, /import \{ BilingualContentCard \} from ['"]@\/components\/bilingual-content-card['"]?/)
  assert.match(component, /selectJobPostContent/)
  assert.match(component, /className="job-post-detail__translation-empty"/)
})
