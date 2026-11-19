import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source = fs.readFileSync(path.join(root, 'src', 'lib', 'appointment-history.ts'), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loadedModule = { exports: {} }
vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports, Date })
const { historyPage, loadAppointmentHistory } = loadedModule.exports

function fixture() {
  const state = { clinic: { id: 'clinic-a' }, clinicError: null, appointmentError: null, rows: [], calls: [] }
  const client = {
    from(table) {
      state.calls.push(['from', table])
      const query = {
        select(value) { state.calls.push(['select', value]); return query },
        eq(column, value) { state.calls.push(['eq', column, value]); return query },
        lt(column, value) { state.calls.push(['lt', column, value]); return query },
        order(column, options) { state.calls.push(['order', column, options.ascending]); return query },
        range(start, end) { state.calls.push(['range', start, end]); return query },
        maybeSingle: async () => ({ data: state.clinic, error: state.clinicError }),
        overrideTypes: async () => ({ data: state.rows, error: state.appointmentError }),
      }
      return query
    },
  }
  return { state, client }
}

test('patient history is scoped to the patient and all statuses before the cutoff', async () => {
  const { state, client } = fixture()
  state.rows = [{ id: 'past', status: 'pending' }, { id: 'cancelled', status: 'cancelled' }]
  const result = await loadAppointmentHistory(client, 'patient-a', 'patient', 1, new Date('2026-01-02T00:00:00Z'))
  assert.equal(result.appointments.length, 2)
  assert.equal(result.hasNextPage, false)
  assert.ok(state.calls.some(call => call[0] === 'eq' && call[1] === 'patient_id' && call[2] === 'patient-a'))
  assert.ok(state.calls.some(call => call[0] === 'lt' && call[1] === 'scheduled_at' && call[2] === '2026-01-02T00:00:00.000Z'))
  assert.ok(state.calls.some(call => call[0] === 'order' && call[1] === 'scheduled_at' && call[2] === false))
  assert.ok(!state.calls.some(call => call[1] === 'status'))
})

test('clinic history verifies ownership and paginates without exposing other clinics', async () => {
  const { state, client } = fixture()
  state.rows = Array.from({ length: 51 }, (_, index) => ({ id: String(index) }))
  const result = await loadAppointmentHistory(client, 'owner-a', 'clinic', 2, new Date())
  assert.equal(result.appointments.length, 50)
  assert.equal(result.hasNextPage, true)
  assert.ok(state.calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'))
  assert.ok(state.calls.some(call => call[0] === 'eq' && call[1] === 'clinic_id' && call[2] === 'clinic-a'))
  assert.ok(state.calls.some(call => call[0] === 'range' && call[1] === 50 && call[2] === 100))

  state.clinic = null
  state.calls = []
  await assert.rejects(loadAppointmentHistory(client, 'other-owner', 'clinic', 1, new Date()), /No clinic profile/)
  assert.ok(!state.calls.some(call => call[0] === 'from' && call[1] === 'appointments'))
})

test('history reports database errors and handles invalid page numbers', async () => {
  const { state, client } = fixture()
  state.appointmentError = { message: 'database unavailable' }
  await assert.rejects(loadAppointmentHistory(client, 'patient-a', 'patient', 1, new Date()), /database unavailable/)
  for (const value of [undefined, '', '0', '-1', '1.5', '99999999999999999999', ['2']]) {
    assert.equal(historyPage(value), 1)
  }
  assert.equal(historyPage('2'), 2)
})
