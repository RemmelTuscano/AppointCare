import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'app', 'auth', 'callback', 'route.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(role = 'patient') {
  const state = {
    profile: { role },
    lookupError: null,
    insertError: null,
    calls: [],
    user: {
      id: 'user-id',
      email: 'user@example.test',
      user_metadata: { role, full_name: 'Signup name', address: 'Signup address', phone: '+639171234567' },
    },
  }
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      getUser: async () => ({ data: { user: state.user } }),
    },
    from(table) {
      return {
        select() { return this },
        eq() { return this },
        async maybeSingle() { return { data: state.profile, error: state.lookupError } },
        async upsert(values, options) {
          state.calls.push({ table, values, options })
          return { error: state.insertError }
        },
      }
    },
  }
  const mocks = {
    '@/lib/supabase/server': { createClient: async () => supabase },
    'next/server': { NextResponse: { redirect: (url) => url } },
  }
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports, URL,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
    console: { error() {} },
  })
  return {
    state,
    callback: () => loadedModule.exports.GET(new Request('https://example.test/auth/callback?code=ok')),
  }
}

test('creates a missing patient profile with signup contact details', async () => {
  const { state, callback } = fixture()
  state.profile = null
  assert.equal(await callback(), 'https://example.test/patient/dashboard')
  assert.equal(state.calls.length, 1)
  assert.equal(state.calls[0].values.full_name, 'Signup name')
  assert.equal(state.calls[0].values.address, 'Signup address')
  assert.equal(state.calls[0].values.phone, '+639171234567')
})

test('clinic callback does not overwrite existing clinic details', async () => {
  const { state, callback } = fixture('clinic')
  assert.equal(await callback(), 'https://example.test/clinic/dashboard')
  assert.equal(state.calls.length, 1)
  assert.equal(state.calls[0].table, 'clinics')
  assert.equal(state.calls[0].options.onConflict, 'user_id')
  assert.equal(state.calls[0].options.ignoreDuplicates, true)
})

test('profile lookup and creation failures are reported', async () => {
  const { state, callback } = fixture()
  state.lookupError = { message: 'database unavailable' }
  assert.match(await callback(), /login\?error=.*load/)
  assert.equal(state.calls.length, 0)
  state.lookupError = null
  state.profile = null
  state.insertError = { message: 'insert failed' }
  assert.match(await callback(), /login\?error=.*create/)
})
