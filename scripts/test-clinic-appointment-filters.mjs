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
    module: loadedModule, exports: loadedModule.exports, Date,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
  })
  return loadedModule.exports
}

const scheduleId = load('src/lib/schedule-id.ts')
const { filterClinicAppointments } = load('src/lib/clinic-appointment-filters.ts', { '@/lib/schedule-id': scheduleId })
const appointments = [
  { id: 'aaaabbbb', status: 'pending', scheduled_at: '2026-01-08T09:00:00', patient: { full_name: 'Alex', email: 'alex@example.test' }, doctor: { name: 'Lee' } },
  { id: 'ccccdddd', status: 'confirmed', scheduled_at: '2026-01-08T10:00:00', patient: { full_name: 'Sam', email: null }, doctor: null },
  { id: 'eeeeffff', status: 'completed', scheduled_at: '2026-01-09T10:00:00', patient: null, doctor: null },
  { id: '11112222', status: 'cancelled', scheduled_at: '2026-01-09T11:00:00', patient: null, doctor: null },
]
const ids = (result) => Array.from(result, appointment => appointment.id)

test('status tabs show matching appointments and all retains cancelled records', () => {
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'pending', '', '')), ['aaaabbbb'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'confirmed', '', '')), ['ccccdddd'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'completed', '', '')), ['eeeeffff'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'cancelled', '', '')), ['11112222'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'all', '', '')), ['aaaabbbb', 'ccccdddd', 'eeeeffff', '11112222'])
})

test('status filters combine with search and day filters', () => {
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'pending', ' LEE ', '8')), ['aaaabbbb'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'confirmed', 'sam', '9')), [])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'all', 'SCH-EEEEFFFF', '9')), ['eeeeffff'])
  assert.deepEqual(ids(filterClinicAppointments(appointments, 'completed', 'sam', '')), [])
})
