import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const adminRoot = fileURLToPath(new URL('../../', import.meta.url))
const server = await createServer({
  appType: 'custom',
  configFile: false,
  envDir: false,
  cacheDir: fileURLToPath(new URL('../node_modules/.vite', import.meta.url)),
  root: adminRoot,
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
})
const { api } = await server.ssrLoadModule('/src/lib/http/axios.ts')
const { teamMemberService } = await server.ssrLoadModule(
  '/src/features/members/services/team-member.service.ts',
)
const originalGet = api.get
let lastRequest

api.get = async (url, config = {}) => {
  lastRequest = { url, query: config.params?.toString() }
  const data = url.endsWith('/filter-options')
    ? { positions: ['Backend Engineer', 'Product Designer'], jobLevels: ['Junior', 'Lead'] }
    : { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }

  return {
    data: {
      isSuccess: true,
      message: 'OK',
      data,
      errors: null,
      traceId: 'test',
      timestampUtc: '2026-10-02T00:00:00Z',
    },
  }
}

after(async () => {
  api.get = originalGet
  await server.close()
})

test('serializes selected filters as repeated query parameters', async () => {
  await teamMemberService.getTeamMembers({
    search: 'Khang',
    status: ['Working', 'Resigned'],
    position: ['Backend Engineer', 'Product Designer'],
    jobLevel: ['Junior', 'Lead'],
    page: 1,
    pageSize: 10,
  })

  assert.equal(lastRequest.url, '/api/v1/admin/team-members')
  assert.equal(
    lastRequest.query,
    'search=Khang&status=Working&status=Resigned&position=Backend+Engineer&position=Product+Designer&jobLevel=Junior&jobLevel=Lead&page=1&pageSize=10',
  )
})

test('loads position and job-level choices from the agreed filter-options endpoint', async () => {
  const options = await teamMemberService.getTeamMemberFilterOptions()

  assert.equal(lastRequest.url, '/api/v1/admin/team-members/filter-options')
  assert.deepEqual(options, {
    positions: ['Backend Engineer', 'Product Designer'],
    jobLevels: ['Junior', 'Lead'],
  })
})
