import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src/app/api/appointments/cancellation-request/route.ts'), 'utf8')
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const appointmentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function fixture() {
  const state = {
    user: { id: 'patient' },
    clinic: { id: 'clinic', user_id: 'owner' },
    appointment: {
      id: appointmentId, patient_id: 'patient', clinic_id: 'clinic', status: 'confirmed',
      scheduled_at: '2026-12-01T10:00:00Z', cancellation_request_status: null, cancellation_request_reason: null,
      patient: { full_name: 'Patient', email: 'patient@example.test', phone: '+639171234567' },
      clinic: { user_id: 'owner', name: 'Clinic', address: 'Address', phone: null },
      doctor: { name: 'Doctor', specialization: null },
    },
    dbError: null,
    notifications: [],
    notificationFailure: false,
    storageFailure: false,
  }
  const admin = {
    from(table) {
      const filters = []
      let update = null
      const query = {
        update(values) { update = values; return query },
        select() { return query },
        eq(key, value) { filters.push((row) => row[key] === value); return query },
        in(key, values) { filters.push((row) => values.includes(row[key])); return query },
        or(value) {
          assert.equal(value, 'cancellation_request_status.is.null,cancellation_request_status.eq.declined')
          filters.push((row) => row.cancellation_request_status === null || row.cancellation_request_status === 'declined')
          return query
        },
        maybeSingle() {
          if (state.dbError) {
            const result = Promise.resolve({ data: null, error: state.dbError })
            result.overrideTypes = () => result
            return result
          }
          const row = table === 'clinics' ? state.clinic : state.appointment
          const matches = row && filters.every((filter) => filter(row))
          if (matches && update) Object.assign(row, update)
          const result = Promise.resolve({ data: matches ? { ...row } : null, error: null })
          result.overrideTypes = () => result
          return result
        },
      }
      return query
    },
  }
  const loaded = { exports: {} }
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) },
    '@/lib/notifications': {
      dispatchAutomatedNotifications: async (payload) => {
        state.notifications.push(payload)
        if (state.notificationFailure) throw new Error('provider unavailable')
        return { email: { sent: true }, sms: { sent: true }, scheduleId: 'schedule', inAppNotifications: [] }
      },
      storeInAppNotifications: async () => {
        if (state.storageFailure) throw new Error('storage unavailable')
      },
    },
  }
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, console: { error() {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
  })
  return { state, ...loaded.exports }
}

const request = (body) => ({ json: async () => body })
const submission = (reason) => request({ appointmentId, reason })
const decision = (value) => request({ appointmentId, decision: value })

test('patient must be signed in, own an active appointment, and supply a nonblank reason', async () => {
  const { state, POST } = fixture()
  state.user = null
  assert.equal((await POST(submission('reason'))).status, 401)
  state.user = { id: 'other-patient' }
  assert.equal((await POST(submission('reason'))).status, 409)
  state.user = { id: 'patient' }
  for (const reason of ['', '  ', 'a'.repeat(1001), 123]) {
    assert.equal((await POST(submission(reason))).status, 400)
  }
  state.appointment.status = 'completed'
  assert.equal((await POST(submission('reason'))).status, 409)
  assert.equal(state.appointment.cancellation_request_status, null)
})

test('request stays pending until the owning clinic approves it', async () => {
  const { state, POST, PATCH } = fixture()
  assert.equal((await POST(submission('  Unable to attend  '))).status, 200)
  assert.equal(state.appointment.cancellation_request_reason, 'Unable to attend')
  assert.equal(state.appointment.status, 'confirmed')
  assert.equal(state.notifications.length, 0)
  assert.equal((await POST(submission('duplicate'))).status, 409)
  assert.equal((await PATCH(decision('approved'))).status, 403)
  state.user = { id: 'other-owner' }
  assert.equal((await PATCH(decision('approved'))).status, 403)
  state.user = { id: 'owner' }
  state.clinic.id = 'other-clinic'
  assert.equal((await PATCH(decision('approved'))).status, 409)
  state.clinic.id = 'clinic'
  const approval = await PATCH(decision('approved'))
  assert.equal(approval.status, 200)
  assert.equal(state.appointment.status, 'cancelled')
  assert.equal(state.appointment.cancellation_request_status, 'approved')
  assert.equal(state.notifications.length, 1)
  assert.equal(state.notifications[0].cancellationRequestApproved, true)
  assert.equal(state.notifications[0].patientEmail, 'patient@example.test')
  assert.equal(state.notifications[0].patientPhone, '+639171234567')
  assert.equal(approval.body.notifications.email.sent, true)
  assert.equal(approval.body.notifications.sms.sent, true)
  assert.equal((await PATCH(decision('approved'))).status, 409)
  assert.equal(state.notifications.length, 1)
})

test('declining preserves the appointment and allows a new request', async () => {
  const { state, POST, PATCH } = fixture()
  state.appointment.status = 'pending'
  await POST(submission('First reason'))
  state.user = { id: 'owner' }
  assert.equal((await PATCH(decision('declined'))).status, 200)
  assert.equal(state.appointment.status, 'pending')
  assert.equal(state.notifications.length, 0)
  state.user = { id: 'patient' }
  assert.equal((await POST(submission('New reason'))).status, 200)
  assert.equal(state.appointment.cancellation_request_reason, 'New reason')
})

test('approved cancellations of pending appointments notify patients and report delivery failures without undoing cancellation', async () => {
  for (const failure of [null, 'notificationFailure', 'storageFailure']) {
    const { state, POST, PATCH } = fixture()
    state.appointment.status = 'pending'
    await POST(submission('reason'))
    state.user = { id: 'owner' }
    if (failure) state[failure] = true
    const response = await PATCH(decision('approved'))
    assert.equal(response.status, 200)
    assert.equal(state.appointment.status, 'cancelled')
    assert.equal(state.notifications.length, 1)
    if (failure) assert.match(response.body.notificationError, /contact the patient/i)
    else assert.equal(response.body.notificationError, null)
  }
})

test('stale reviews and database errors do not report success', async () => {
  const { state, POST, PATCH } = fixture()
  await POST(submission('reason'))
  state.user = { id: 'owner' }
  state.appointment.status = 'completed'
  assert.equal((await PATCH(decision('approved'))).status, 409)
  state.dbError = { message: 'database unavailable' }
  assert.equal((await PATCH(decision('approved'))).status, 500)
  assert.equal(state.notifications.length, 0)
})
