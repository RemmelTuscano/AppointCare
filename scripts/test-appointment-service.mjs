import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
function load(relativePath, mocks = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule, exports: loadedModule.exports, URL, Date,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-key' } },
    console: { error() {}, warn() {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
  })
  return loadedModule.exports
}

function fixture() {
  const state = { user: { id: 'patient' }, appointment: null, clinicId: 'clinic', doctor: { id: 'doctor', name: 'Doctor', specialization: 'Dentistry', is_available: true }, bookingError: null }
  const admin = {
    from(table) {
      if (table === 'clinics') return { select: () => ({ eq: () => ({
        single: async () => ({ data: { id: state.clinicId }, error: null }),
        maybeSingle: async () => ({ data: { id: state.clinicId }, error: null }),
      }) }) }
      if (table === 'doctors') {
        const query = { select: () => query, eq: () => query, single: async () => ({ data: state.doctor, error: null }) }
        return query
      }
      assert.equal(table, 'appointments')
      return {
        select() {
          const query = {
            eq: () => query, in: () => query, gte: () => query,
            lt: async () => ({ count: 0, error: null }),
            order: async () => ({ data: state.appointment ? [state.appointment] : [], error: null }),
          }
          return query
        },
        insert(values) {
          state.appointment = { id: 'appointment', ...values }
          return { select: () => ({ single: async () => ({ data: state.appointment, error: state.bookingError }) }) }
        },
      }
    },
  }
  const session = { auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }
  const response = { json: (body, options = {}) => ({ body, status: options.status || 200 }) }
  const common = {
    'next/server': { NextResponse: response },
    '@/lib/supabase/server': { createClient: async () => session },
  }
  const { POST } = load('src/app/api/appointments/book/route.ts', {
    ...common,
    '@supabase/supabase-js': { createClient: () => admin },
    '@/lib/services': load('src/lib/services.ts'),
  })
  const { GET } = load('src/app/api/clinic/appointments/route.ts', {
    ...common,
    '@/lib/supabase/admin': { createAdminClient: () => admin },
  })
  return { state, POST, GET }
}

const valid = { clinicId: 'clinic', doctorId: 'doctor', scheduledAt: '2026-12-01T10:00:00Z', service: 'Root Canal', notes: 'Patient note' }
const request = (body) => ({ json: async () => body })

test('selected service is saved separately from notes and returned to the owning clinic', async () => {
  const { state, POST, GET } = fixture()
  const booked = await POST(request(valid))
  assert.equal(booked.status, 200)
  assert.equal(state.appointment.service, 'Root Canal')
  assert.equal(state.appointment.notes, 'Patient note')
  state.user = { id: 'clinic-owner' }
  const response = await GET({ url: 'https://example.test/api/clinic/appointments?clinicId=clinic' })
  assert.equal(response.status, 200)
  assert.equal(response.body.appointments[0].service, 'Root Canal')
})

test('missing or inappropriate services are rejected without creating an appointment', async () => {
  const { state, POST } = fixture()
  for (const service of [undefined, '', '   ', 123, 'Cardiac Checkup']) {
    const response = await POST(request({ ...valid, service }))
    assert.equal(response.status, 400)
    assert.equal(state.appointment, null)
  }
})

test('database errors do not report a successful booking', async () => {
  const { state, POST } = fixture()
  state.bookingError = { message: 'database unavailable' }
  assert.equal((await POST(request(valid))).status, 500)
})
