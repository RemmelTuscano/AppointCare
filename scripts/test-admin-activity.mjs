import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'app', '(dashboard)', 'admin', 'activity', 'page.tsx'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const require = createRequire(import.meta.url)

function fixture(rows, error = null) {
  const state = { calls: [], logs: [] }
  const admin = {
    from(table) {
      state.calls.push(['from', table])
      let filtered = rows
      const query = {
        select() { return query },
        eq(column, value) { state.calls.push(['eq', column, value]); filtered = filtered.filter(row => row[column] === value); return query },
        order(column, options) { state.calls.push(['order', column, options.ascending]); return query },
        limit(count) { state.calls.push(['limit', count]); filtered = filtered.slice(0, count); return query },
        overrideTypes: async () => ({ data: error ? null : filtered, error }),
      }
      return query
    },
  }
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports, Intl, Date,
    console: { error: (...args) => state.logs.push(args) },
    require(name) {
      if (name === '@/lib/supabase/admin-access') return { requireAdminClient: async () => admin }
      return require(name)
    },
  })
  return { state, render: async () => renderToStaticMarkup(await loadedModule.exports.default()) }
}

test('only administrator actions are shown, filtered before the 100-event limit', async () => {
  const others = Array.from({ length: 120 }, (_, index) => ({ id: String(index), actor_is_admin: false }))
  const admin = { id: 'admin', actor_is_admin: true, action: 'clinic_verified', entity_type: 'clinic', summary: 'Clinic verified', created_at: '2026-01-01T00:00:00Z', actor: { full_name: 'Admin', email: 'admin@example.test' } }
  const { state, render } = fixture([...others, admin])
  const html = await render()
  assert.match(html, /Clinic verified/)
  assert.match(html, /Admin/)
  assert.ok(state.calls.findIndex(call => call[0] === 'eq' && call[1] === 'actor_is_admin' && call[2] === true) < state.calls.findIndex(call => call[0] === 'limit'))
})

test('unavailable logs report an error rather than showing an empty success state', async () => {
  const { state, render } = fixture([], { message: 'database failure' })
  const html = await render()
  assert.match(html, /Activity logging is not available/)
  assert.doesNotMatch(html, /No administrator activity recorded yet/)
  assert.equal(state.logs.length, 1)
})
