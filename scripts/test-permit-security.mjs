import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const clinicId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'app', 'api', 'clinics', 'permit', 'route.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const permitPathSource = fs.readFileSync(path.join(root, 'src', 'lib', 'supabase', 'permit-path.ts'), 'utf8')
const permitPathCompiled = ts.transpileModule(permitPathSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const permitPathModule = { exports: {} }
vm.runInNewContext(permitPathCompiled, { module: permitPathModule, exports: permitPathModule.exports })

function fixture(permitUrl) {
  const state = {
    user: { id: 'owner' },
    clinic: { id: clinicId, user_id: 'owner', permit_url: permitUrl },
    removed: [],
    uploaded: [],
    logs: [],
    removalError: null,
    updateError: null,
    beforeUpdate: null,
  }
  const admin = {
    storage: {
      from(bucket) {
        assert.equal(bucket, 'clinic_permits')
        return {
          async upload(objectPath) {
            state.uploaded.push(objectPath)
            return { data: { path: objectPath }, error: null }
          },
          async remove(paths) {
            state.removed.push(...paths)
            return { error: state.removalError }
          },
        }
      },
    },
    from(table) {
      assert.equal(table, 'clinics')
      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, 'user_id')
              return {
                async single() {
                  return { data: value === state.clinic.user_id ? { ...state.clinic } : null, error: null }
                },
              }
            },
          }
        },
        update(values) {
          const filters = []
          const query = {
            eq(column, value) { filters.push([column, value]); return query },
            is(column, value) { filters.push([column, value]); return query },
            select() { return query },
            async maybeSingle() {
              state.beforeUpdate?.()
              if (state.updateError) return { data: null, error: state.updateError }
              if (!filters.every(([column, value]) => state.clinic[column] === value)) return { data: null, error: null }
              Object.assign(state.clinic, values)
              return { data: { id: state.clinic.id }, error: null }
            },
          }
          return query
        },
      }
    },
  }
  const sessionClient = {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'clinic' } }) }) }) }),
  }
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    'node:crypto': { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    '@/lib/supabase/server': { createClient: async () => sessionClient },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/activity': { recordActivity: async (entry) => state.logs.push(entry) },
    '@/lib/supabase/permit-path': permitPathModule.exports,
  }
  const loadedModule = { exports: {} }
  vm.runInNewContext(compiled, {
    module: loadedModule, exports: loadedModule.exports,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
    File,
    console: { error() {} },
  })
  return { state, ...loadedModule.exports }
}

function uploadRequest() {
  const file = new File(['permit'], 'permit.pdf', { type: 'application/pdf' })
  return { formData: async () => ({ get: () => file }) }
}

test('delete rejects unauthenticated and cross-clinic or malformed paths before storage access', async () => {
  const unauthorized = fixture(`${clinicId}/file.pdf`)
  unauthorized.state.user = null
  assert.equal((await unauthorized.DELETE()).status, 401)
  assert.equal(unauthorized.state.removed.length, 0)

  for (const objectPath of [
    `${otherId}/file.pdf`,
    `permits/${otherId}-123.pdf`,
    `${clinicId}/../${otherId}/file.pdf`,
    `${clinicId}/%2e%2e`,
    `${clinicId}\\file.pdf`,
    `permits/${clinicId}`,
    `elsewhere/${clinicId}-123.pdf`,
  ]) {
    const { state, DELETE } = fixture(objectPath)
    assert.equal((await DELETE()).status, 409, objectPath)
    assert.equal(state.removed.length, 0, objectPath)
    assert.equal(state.clinic.permit_url, objectPath)
  }
})

test('delete accepts current and legacy clinic paths and checks storage errors', async () => {
  for (const objectPath of [`${clinicId}/file.pdf`, `permits/${clinicId}-123.pdf`]) {
    const { state, DELETE } = fixture(objectPath)
    assert.equal((await DELETE()).status, 200)
    assert.deepEqual(state.removed, [objectPath])
    assert.equal(state.clinic.permit_url, null)
    assert.equal(state.logs.length, 1)
  }
  const { state, DELETE } = fixture(`${clinicId}/file.pdf`)
  state.removalError = { message: 'storage unavailable' }
  assert.equal((await DELETE()).status, 500)
  assert.equal(state.clinic.permit_url, `${clinicId}/file.pdf`)
  assert.equal(state.logs.length, 0)
})

test('replacement removes only an owned old path after linking the new object', async () => {
  for (const oldPath of [null, `${clinicId}/old.pdf`, `permits/${clinicId}-123.pdf`, `${otherId}/file.pdf`]) {
    const { state, POST } = fixture(oldPath)
    const response = await POST(uploadRequest())
    assert.equal(response.status, 200)
    assert.equal(state.clinic.permit_url, state.uploaded[0])
    assert.deepEqual(state.removed, !oldPath || oldPath.startsWith(otherId) ? [] : [oldPath])
    assert.equal(state.logs.length, 1)
  }
})

test('a failed clinic update cleans up the new upload without deleting the old permit', async () => {
  const oldPath = `permits/${clinicId}-123.pdf`
  const { state, POST } = fixture(oldPath)
  state.updateError = { message: 'database unavailable' }
  assert.equal((await POST(uploadRequest())).status, 500)
  assert.equal(state.clinic.permit_url, oldPath)
  assert.deepEqual(state.removed, state.uploaded)
  assert.equal(state.logs.length, 0)
})

test('concurrent changes are not overwritten and failed replacement cleans up its own upload', async () => {
  const oldPath = `${clinicId}/old.pdf`
  const replacement = fixture(oldPath)
  replacement.state.beforeUpdate = () => { replacement.state.clinic.permit_url = `${clinicId}/newer.pdf` }
  assert.equal((await replacement.POST(uploadRequest())).status, 409)
  assert.equal(replacement.state.clinic.permit_url, `${clinicId}/newer.pdf`)
  assert.deepEqual(replacement.state.removed, replacement.state.uploaded)

  const deletion = fixture(oldPath)
  deletion.state.beforeUpdate = () => { deletion.state.clinic.permit_url = `${clinicId}/newer.pdf` }
  assert.equal((await deletion.DELETE()).status, 409)
  assert.equal(deletion.state.clinic.permit_url, `${clinicId}/newer.pdf`)
  assert.deepEqual(deletion.state.removed, [oldPath])
})
