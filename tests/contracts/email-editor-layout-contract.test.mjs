import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const newsStyles = read('../../src/styles/news.css')
const interviewStyles = read('../../src/styles/applicants.css')
const contactStyles = read('../../src/styles/contacts.css')
const interviewComposer = read('../../src/features/applicants/components/interview-email-composer.tsx')
const contactComposer = read('../../src/features/contacts/components/contact-email-composer.tsx')

test('email rich-text editors reuse the create-news editor frame tokens', () => {
  for (const styles of [interviewStyles, contactStyles]) {
    assert.match(styles, /\.\w+-rich-editor \{[^}]*border:\s*1px solid #d8e0e8;[^}]*border-radius:\s*8px;/s)
    assert.match(styles, /\.\w+-rich-editor:focus-within \{[^}]*border-color:\s*#ff5b23;[^}]*box-shadow:\s*0 0 0 3px rgb\(255 91 35 \/ 10%\);/s)
    assert.match(styles, /\.\w+-rich-editor__toolbar \{[^}]*min-height:\s*40px;[^}]*border-bottom:\s*1px solid #f2ddd3;[^}]*background:\s*#fff8f4;[^}]*padding:\s*5px 7px;/s)
    assert.match(styles, /\.\w+-rich-editor__surface \{[^}]*min-height:\s*128px;[^}]*color:\s*#273240;[^}]*font-size:\s*12px;[^}]*line-height:\s*1\.65;[^}]*padding:\s*12px 13px;/s)
    assert.match(styles, /\.\w+-rich-editor__meta \{[^}]*border-top:\s*1px solid #f2ddd3;[^}]*color:\s*#94a3b8;[^}]*font-size:\s*10px;/s)
  }

  assert.match(newsStyles, /\.news-rich-editor \{[^}]*border:\s*1px solid #d8e0e8;[^}]*border-radius:\s*8px;/s)
})

test('email form section headings follow create-news typography', () => {
  assert.match(interviewStyles, /\.interview-composer__section-heading strong,[\s\S]*?font-size:\s*15px;[\s\S]*?font-weight:\s*800;/)
  assert.match(contactStyles, /\.contact-reply-page__section h2 \{[^}]*color:\s*#273240;[^}]*font-size:\s*15px;[^}]*font-weight:\s*800;/s)
  assert.match(newsStyles, /\.news-create__card h2 \{[^}]*font-size:\s*15px;[^}]*font-weight:\s*800;/s)
})

test('email actions reuse the create-news action dimensions and states', () => {
  assert.match(interviewComposer, /className="interview-invitation-page__action interview-invitation-page__action--cancel"/)
  assert.match(interviewComposer, /className="interview-invitation-page__action interview-invitation-page__action--submit"/)
  assert.match(contactComposer, /className="contact-reply-page__action contact-reply-page__action--cancel"/)
  assert.match(contactComposer, /className="contact-reply-page__action contact-reply-page__action--submit"/)

  for (const styles of [interviewStyles, contactStyles]) {
    assert.match(styles, /\.\w+-.*__action \{[^}]*min-height:\s*34px;[^}]*border-radius:\s*7px;[^}]*padding:\s*0 12px;[^}]*font-size:\s*11px;[^}]*font-weight:\s*750;/s)
    assert.match(styles, /__action--cancel \{[^}]*border:\s*1px solid #d9e0e8;[^}]*background:\s*#fff;[^}]*color:\s*#273240;/s)
    assert.match(styles, /__action--submit \{[^}]*background:\s*#ff5b23;[^}]*color:\s*#fff;/s)
    assert.match(styles, /__action--submit:hover:not\(:disabled\) \{[^}]*background:\s*#e94d19;/s)
  }
})

test('contact reply uses an in-app leave modal for unsent drafts', () => {
  assert.match(contactComposer, /import \{[^}]*Modal, useOverlayState[^}]*\} from '@heroui\/react'/)
  assert.match(contactComposer, /AlertTriangle/)
  assert.match(contactComposer, /const closeConfirmation = useOverlayState\(\)/)
  assert.match(contactComposer, /closeConfirmation\.open\(\)/)
  assert.match(contactComposer, /closeConfirmation\.close\(\)/)
  assert.doesNotMatch(contactComposer, /window\.confirm\(/)
  assert.match(contactComposer, /contact-reply-page__leave-backdrop/)
  assert.match(contactComposer, /contact-reply-page__leave-submit/)

  assert.match(contactStyles, /\.contact-reply-page__leave-dialog \{[^}]*border:\s*1px solid #e4e8ed;[^}]*border-radius:\s*14px;[^}]*background:\s*#fff;/s)
  assert.match(contactStyles, /\.contact-reply-page__leave-heading \{[^}]*color:\s*#18212d;[^}]*font-size:\s*17px;[^}]*font-weight:\s*800;/s)
  assert.match(contactStyles, /\.contact-reply-page__leave-submit \{[^}]*background:\s*#ff5b23;/s)
})

test('contact reply follows the interview composer shell and preview controls', () => {
  assert.match(contactComposer, /className="contact-reply-page__actions"/)
  assert.match(contactComposer, /className="contact-reply-page__action contact-reply-page__action--cancel"/)
  assert.match(contactComposer, /className="contact-reply-page__action contact-reply-page__action--submit"/)
  assert.doesNotMatch(contactComposer, /contact-reply-page__footer/)
  assert.doesNotMatch(contactComposer, /Quay lại/)

  assert.match(contactStyles, /\.contact-reply-page__header h1 \{[^}]*font-size:\s*20px;/s)
  assert.match(contactStyles, /\.contact-reply-page__layout \{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s)
  assert.match(contactStyles, /\.contact-reply-page__form-pane \{[^}]*gap:\s*14px;[^}]*padding:\s*18px 20px 24px;/s)
  assert.match(contactStyles, /\.contact-reply-page__field input \{[^}]*height:\s*38px;[^}]*font-size:\s*11px;/s)
  assert.match(contactStyles, /\.contact-reply-page__viewport-toggle \{[^}]*border:\s*1px solid #dde1e6;[^}]*border-radius:\s*7px;[^}]*padding:\s*2px;/s)
  assert.match(contactStyles, /\.contact-reply-page__viewport-toggle button \{[^}]*width:\s*28px;[^}]*height:\s*26px;/s)
  assert.match(contactStyles, /\.contact-reply-page__viewport-toggle button\.is-active \{[^}]*background:\s*#fff1ea;[^}]*color:\s*#e9561d;/s)
  assert.match(contactStyles, /\.contact-reply-page__preview-frame-wrap \{[^}]*min-height:\s*480px;[^}]*border:\s*1px solid #e0e4e9;[^}]*background:\s*#ececea;/s)
  assert.match(contactStyles, /\.contact-reply-page__preview-frame-wrap iframe \{[^}]*min-height:\s*620px;[^}]*border:\s*0;/s)
})
