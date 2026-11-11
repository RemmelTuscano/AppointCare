import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

function loadModule(relativePath, mocks) {
  const source = fs.readFileSync(path.join(scriptDir, '..', relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule,
    exports: loadedModule.exports,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
    URL,
    console,
    process,
  }, { filename: relativePath })
  return loadedModule.exports
}

function session(user, error = null) {
  return { auth: { getUser: async () => ({ data: { user }, error }) } }
}

test('admin access requires verified server-controlled metadata', async () => {
  const admin = { privileged: true }
  let user = null
  let calls = 0
  const { requireAdminClient } = loadModule('src/lib/supabase/admin-access.ts', {
    'server-only': {},
    'next/navigation': { redirect: (url) => { throw new Error(`redirect:${url}`) } },
    '@/lib/supabase/server': { createClient: async () => session(user) },
    '@/lib/supabase/admin': { createAdminClient: () => { calls++; return admin } },
  })

  await assert.rejects(requireAdminClient(), /redirect:\/login/)
  user = { app_metadata: {}, user_metadata: { role: 'admin' } }
  await assert.rejects(requireAdminClient(), /redirect:\/$/)
  assert.equal(calls, 0)
  user = { app_metadata: { role: 'admin' } }
  assert.equal(await requireAdminClient(), admin)
  assert.equal(calls, 1)
})

test('clinic appointments require authentication and ownership before querying data', async () => {
  let user = null
  let clinic = null
  let clinicError = null
  let appointmentError = null
  let appointmentQueries = 0
  let queriedClinic = null
  const admin = {
    from(table) {
      if (table === 'clinics') {
        return { select: () => ({ eq: (column, value) => {
          assert.equal(column, 'user_id')
          assert.equal(value, user.id)
          return { maybeSingle: async () => ({ data: clinic, error: clinicError }) }
        } }) }
      }
      assert.equal(table, 'appointments')
      appointmentQueries++
      return { select: () => ({ eq: (column, value) => {
        assert.equal(column, 'clinic_id')
        queriedClinic = value
        return { order: async () => ({ data: [{ id: 'appointment' }], error: appointmentError }) }
      } }) }
    },
  }
  const { GET } = loadModule('src/app/api/clinic/appointments/route.ts', {
    '@/lib/supabase/server': { createClient: async () => session(user) },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) } },
  })
  const request = (id) => ({ url: `https://example.test/api/clinic/appointments${id ? `?clinicId=${id}` : ''}` })

  assert.equal((await GET(request())).status, 400)
  assert.equal((await GET(request('clinic-a'))).status, 401)
  user = { id: 'user-a' }
  assert.equal((await GET(request('clinic-a'))).status, 403)
  clinic = { id: 'clinic-b' }
  assert.equal((await GET(request('clinic-a'))).status, 403)
  assert.equal(appointmentQueries, 0)
  clinicError = { message: 'database failure' }
  assert.equal((await GET(request('clinic-a'))).status, 500)
  assert.equal(appointmentQueries, 0)
  clinicError = null
  clinic = { id: 'clinic-a' }
  const response = await GET(request('clinic-a'))
  assert.equal(response.status, 200)
  assert.equal(response.body.appointments[0].id, 'appointment')
  assert.equal(response.headers['Cache-Control'], 'private, no-store')
  assert.equal(queriedClinic, 'clinic-a')
  appointmentError = { message: 'database failure' }
  assert.equal((await GET(request('clinic-a'))).status, 500)
})

test('backup rejects forged admin roles and allows trusted administrators', async () => {
  let user = null
  let adminCalls = 0
  const admin = {
    from: () => ({ select: async () => ({ data: [], error: null }) }),
  }
  class Workbook {
    xlsx = { writeBuffer: async () => new Uint8Array() }
    addWorksheet() { return { addRow() {} } }
  }
  class Response {
    constructor(body, options) { this.body = body; this.status = options.status; this.headers = options.headers }
    static json(body, options) { return new Response(body, options) }
  }
  const { GET } = loadModule('src/app/api/admin/backup/route.ts', {
    'next/server': { NextResponse: Response },
    exceljs: { default: { Workbook } },
    '@/lib/supabase/admin': { createAdminClient: () => { adminCalls++; return admin } },
    '@/lib/supabase/server': { createClient: async () => session(user) },
    '@/lib/activity': { recordActivity: async () => {} },
  })

  assert.equal((await GET()).status, 401)
  user = { id: 'user-a', app_metadata: {}, user_metadata: { role: 'admin' } }
  assert.equal((await GET()).status, 403)
  assert.equal(adminCalls, 0)
  user.app_metadata.role = 'admin'
  assert.equal((await GET()).status, 200)
  assert.equal(adminCalls, 1)
})

test('direct message endpoints cannot send arbitrary content', async () => {
  const mocks = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/email-templates': {},
  }
  for (const route of [
    'src/app/api/notifications/email/route.ts',
    'src/app/api/notifications/sms/route.ts',
    'src/app/api/ai/chat/notifications/email/route.ts',
  ]) {
    const { POST } = loadModule(route, mocks)
    assert.equal((await POST()).status, 410)
  }
})

test('notification dispatch uses trusted appointment data and checks ownership and event state', async () => {
  let user = null
  let sent
  let appointment = {
    id: 'a', patient_id: 'patient', scheduled_at: new Date(Date.now() + 60_000).toISOString(), status: 'pending', notes: null,
    patient: { full_name: 'Patient', email: 'real@example.test', phone: null },
    clinic: { user_id: 'clinic-owner', name: 'Clinic', address: 'Address', phone: null },
    doctor: { name: 'Doctor', specialization: null, is_available: true },
  }
  const admin = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({
    overrideTypes: async () => ({ data: appointment, error: null }),
  }) }) }) }) }
  const { POST } = loadModule('src/app/api/notifications/dispatch/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/supabase/server': { createClient: async () => session(user) },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/notifications': { dispatchAutomatedNotifications: async (payload) => {
      sent = payload
      return { scheduleId: 'schedule', email: {}, sms: {}, inAppNotifications: [] }
    } },
  })
  const request = (body) => ({ json: async () => body })
  assert.equal((await POST(request({ appointmentId: 'a', type: 'created' }))).status, 401)
  user = { id: 'stranger' }
  assert.equal((await POST(request({ appointmentId: 'a', type: 'created' }))).status, 403)
  assert.equal((await POST(request({ appointmentId: 'a', type: 'confirmed' }))).status, 403)
  assert.equal(sent, undefined)
  user.id = 'patient'
  assert.equal((await POST(request({ appointmentId: 'a', type: 'confirmed' }))).status, 403)
  const result = await POST(request({ appointmentId: 'a', type: 'created', patientEmail: 'attacker@example.test', patientUserId: 'other' }))
  assert.equal(result.status, 200)
  assert.equal(sent.patientEmail, 'real@example.test')
  assert.equal(sent.patientUserId, 'patient')
  user.id = 'clinic-owner'
  assert.equal((await POST(request({ appointmentId: 'a', type: 'confirmed' }))).status, 403)
  appointment.status = 'confirmed'
  assert.equal((await POST(request({ appointmentId: 'a', type: 'confirmed' }))).status, 200)
  assert.equal((await POST(request({ appointmentId: 'a', type: 'doctor_unavailable' }))).status, 403)
  appointment.doctor.is_available = false
  appointment.scheduled_at = '2026-01-01T10:00:00Z'
  assert.equal((await POST(request({ appointmentId: 'a', type: 'doctor_unavailable' }))).status, 403)
  appointment.scheduled_at = new Date(Date.now() + 60_000).toISOString()
  assert.equal((await POST(request({ appointmentId: 'a', type: 'doctor_unavailable' }))).status, 200)
  appointment = null
  assert.equal((await POST(request({ appointmentId: 'missing', type: 'created' }))).status, 404)
})

test('reminders require configured secret and never return patient details', async () => {
  const previous = process.env.REMINDER_CRON_SECRET
  let queries = 0
  const admin = { from: () => { queries++; return { select: () => ({ in: () => ({ gte: () => ({
    lte: async () => ({ data: [{ id: 'a', patient_id: 'p', scheduled_at: '2026-01-01', patient: { email: 'private@example.test' } }], error: null }),
  }) }) }) } } }
  const { POST } = loadModule('src/app/api/notifications/reminders/route.ts', {
    'node:crypto': crypto,
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/notifications': { dispatchAutomatedNotifications: async () => ({ email: { sent: true }, sms: { skipped: true } }) },
  })

  await test('rescheduling is limited to the owning clinic and its doctors', async () => {
    let user = null
    let ownedClinic = null
    let doctor = null
    let updates = 0
    let dispatched = 0
    const appointment = {
      id: 'a', clinic_id: 'clinic-a', patient_id: 'patient', scheduled_at: '2026-01-01T10:00:00Z',
      patient: { full_name: 'Patient' }, clinic: { user_id: 'owner', name: 'Clinic' }, doctor: { name: 'Doctor' },
    }
    const admin = {
      from(table) {
        if (table === 'clinics') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ownedClinic, error: null }) }) }) }
        if (table === 'doctors') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: doctor, error: null }) }) }) }) }
        assert.equal(table, 'appointments')
        return {
          select: () => ({ eq: () => ({ eq: (column, clinicId) => ({
            single: async () => ({ data: clinicId === appointment.clinic_id ? appointment : null, error: null }),
          }) }) }),
          update: () => {
            updates++
            return { eq: () => ({ eq: (column, clinicId) => {
              assert.equal(clinicId, 'clinic-a')
              return { select: () => ({ single: async () => ({ data: appointment, error: null }) }) }
            } }) }
          },
        }
      },
    }
    const { POST } = loadModule('src/app/api/appointments/reschedule/route.ts', {
      'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
      '@/lib/supabase/server': { createClient: async () => session(user) },
      '@/lib/supabase/admin': { createAdminClient: () => admin },
      '@/lib/activity': { recordActivity: async () => {} },
      '@/lib/notifications': { dispatchAutomatedNotifications: async () => {
        dispatched++
        return { scheduleId: 'schedule', inAppNotifications: [] }
      } },
    })
    const request = (doctorId) => ({ json: async () => ({ appointmentId: 'a', newScheduledAt: '2026-01-02T10:00:00Z', newDoctorId: doctorId }) })
    assert.equal((await POST(request())).status, 401)
    user = { id: 'patient' }
    assert.equal((await POST(request())).status, 403)
    ownedClinic = { id: 'clinic-b' }
    assert.equal((await POST(request())).status, 404)
    ownedClinic = { id: 'clinic-a' }
    assert.equal((await POST(request('other-clinic-doctor'))).status, 400)
    assert.equal(updates, 0)
    assert.equal(dispatched, 0)
    doctor = { id: 'doctor-a', is_available: true }
    assert.equal((await POST(request('doctor-a'))).status, 200)
    assert.equal(updates, 1)
    assert.equal(dispatched, 1)
  })
  const request = (token) => ({ headers: { get: () => token } })
  try {
    delete process.env.REMINDER_CRON_SECRET
    assert.equal((await POST(request(null))).status, 500)
    process.env.REMINDER_CRON_SECRET = 'test-secret-with-at-least-32-characters'
    assert.equal((await POST(request('Bearer incorrect'))).status, 401)
    assert.equal(queries, 0)
    const result = await POST(request(`Bearer ${process.env.REMINDER_CRON_SECRET}`))
    assert.equal(result.status, 200)
    assert.equal(result.body.count, 1)
    assert.equal(JSON.stringify(result.body).includes('private@example.test'), false)
  } finally {
    if (previous === undefined) delete process.env.REMINDER_CRON_SECRET
    else process.env.REMINDER_CRON_SECRET = previous
  }
})
