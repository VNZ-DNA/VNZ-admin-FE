import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(
  new URL('../../src/features/careers/components/create-job-post-form.tsx', import.meta.url),
  'utf8',
)
const editComponent = readFileSync(
  new URL('../../src/features/careers/components/edit-job-post-form.tsx', import.meta.url),
  'utf8',
)
const bilingualCard = readFileSync(
  new URL('../../src/components/bilingual-content-card.tsx', import.meta.url),
  'utf8',
)
const styles = readFileSync(new URL('../../src/styles/careers.css', import.meta.url), 'utf8')

test('create job post uses the news draft button surface for cancel and save draft', () => {
  assert.equal(component.match(/className="job-post-create__draft"/g)?.length, 2)
  assert.match(
    styles,
    /\.job-post-create--new \.job-post-create__draft\s*\{[^}]*border:\s*1px solid #d8e0e8;[^}]*background:\s*#fff;[^}]*color:\s*#273240;/s,
  )
})

test('create job post uses the shared bilingual content card and preserves both locale payloads', () => {
  assert.match(component, /import \{ BilingualContentCard \} from ['"]@\/components\/bilingual-content-card['"]?/)
  assert.match(component, /translations\.en\.title/)
  assert.match(component, /translations\.en\.description/)
  assert.match(component, /errorLocales=/)
})

test('create job post keeps shared skills inside the bilingual card outside the locale panel', () => {
  assert.match(bilingualCard, /sharedSection\?: ReactNode/)
  assert.match(bilingualCard, /\{sharedSection\}/)
  assert.match(component, /sharedSection=\{/)
  assert.match(component, /className="job-post-create__skills"/)
})

test('edit job post uses the bilingual content card while keeping metadata outside locale content', () => {
  assert.match(editComponent, /import \{ BilingualContentCard \} from ['"]@\/components\/bilingual-content-card['"]?/)
  assert.match(editComponent, /translations\.en\.title/)
  assert.match(editComponent, /translations\.en\.requirements/)
  assert.match(editComponent, /sharedSection=\{/)
  assert.match(editComponent, /name=\{titleField\}/)
  assert.match(editComponent, /buildCreateJobPostPayload\(/)
})
