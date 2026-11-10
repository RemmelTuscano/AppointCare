import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const clinicId = 'c71b69dd-e9da-4c1f-8ae4-c0d089424ace'

function fixture() {
  const state = {
    user: null,
    verified: false,
    updateError: null,
    ownerError: null,
    ownerEmail: 'owner@example.test',
    emailResult: { sent: true },
    emails: [],
    logs: [],
    paths: [],
    adminCalls: 0,
  }
  const admin = {
    from(table) {
      if (table === 'activity_logs') return { insert: async (entry) => { state.logs.push(entry); return { error: null } } }
      assert.equal(table, 'clinics')
      return { update: ({ is_verified: next }) => {
        let matches = false
        const query = {
          eq(column, value) {
            if (column === 'id') assert.equal(value, clinicId)
            else { assert.equal(column, 'is_verified'); matches = state.verified === value }
            return query
          },
          or(filter) {
            assert.equal(filter, 'is_verified.eq.false,is_verified.is.null')
            matches = state.verified === false || state.verified === null
            return query
          },
          select() {
            return { maybeSingle: async () => {
              if (state.updateError) return { data: null, error: state.updateError }
              if (!matches) return { data: null, error: null }
              state.verified = next
              return { data: { id: clinicId, name: '<Clinic & Co>', user_id: 'owner-id' }, error: null }
            } }
          },
        }
        return query
      } }
    },
    auth: { admin: { getUserById: async (id) => {
      assert.equal(id, 'owner-id')
      return { data: { user: state.ownerEmail ? { email: state.ownerEmail } : null }, error: state.ownerError }
    } } },
  }
  const mocks = {
    'next/cache': { revalidatePath: (route) => state.paths.push(route) },
    '@/lib/supabase/admin': { createAdminClient: () => { state.adminCalls++; return admin } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) },
    '@/lib/send-email': { sendEmail: async (message) => { state.emails.push(message); return state.emailResult } },
  }
  const source = fs.readFileSync(path.join(root, 'src/app/(dashboard)/admin/clinics/actions.ts'), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports,
    require(name) { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name] },
    console: { error() {} },
  })
  return { state, set: loadedModule.exports.setClinicVerification }
}

test('verification requires trusted admin authorization and valid input', async () => {
  const { state, set } = fixture()
  assert.equal((await set('invalid', true)).status, 'error')
  assert.equal((await set(clinicId, true)).status, 'error')
  state.user = { id: 'user', app_metadata: {}, user_metadata: { role: 'admin' } }
  assert.equal((await set(clinicId, true)).status, 'error')
  assert.equal(state.adminCalls, 0)
  assert.equal(state.emails.length, 0)
})

test('verification notifies the account owner once and escapes the clinic name', async () => {
  const { state, set } = fixture()
  state.user = { id: 'admin', app_metadata: { role: 'admin' } }
  const result = await set(clinicId, true)
  assert.equal(result.status, 'success')
  assert.match(result.message, /delivery is not confirmed/)
  assert.equal(state.verified, true)
  assert.equal(state.emails[0].to, 'owner@example.test')
  assert.match(state.emails[0].html, /&lt;Clinic &amp; Co&gt;/)
  assert.equal(state.logs[0].action, 'clinic_verified')
  assert.ok(state.paths.includes('/admin/clinics'))
  assert.equal((await set(clinicId, true)).status, 'error')
  assert.equal(state.emails.length, 1)
  assert.equal((await set(clinicId, false)).status, 'success')
  assert.equal(state.verified, false)
  assert.equal(state.emails.length, 1)
})

test('failed update does not send email; notification failures preserve verified status', async () => {
  const { state, set } = fixture()
  state.user = { id: 'admin', app_metadata: { role: 'admin' } }
  state.updateError = { message: 'database failure' }
  assert.equal((await set(clinicId, true)).status, 'error')
  assert.equal(state.emails.length, 0)
  state.updateError = null
  state.emailResult = { sent: false, error: 'Domain not verified' }
  const result = await set(clinicId, true)
  assert.equal(result.status, 'warning')
  assert.match(result.message, /verified.*Domain not verified/)
  assert.equal(state.verified, true)
  assert.equal(state.logs.length, 1)
})

test('missing account email is reported after verification without sending email', async () => {
  const { state, set } = fixture()
  state.user = { id: 'admin', app_metadata: { role: 'admin' } }
  state.ownerEmail = null
  const result = await set(clinicId, true)
  assert.equal(result.status, 'warning')
  assert.match(result.message, /verified.*email could not be found/)
  assert.equal(state.verified, true)
  assert.equal(state.emails.length, 0)
})
