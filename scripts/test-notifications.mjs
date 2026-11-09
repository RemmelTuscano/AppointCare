import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const nodeRequire = createRequire(import.meta.url)

function load(relativePath, mocks, env, fetchMock) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loadedModule = { exports: {} }
  vm.runInNewContext(output, {
    module: loadedModule,
    exports: loadedModule.exports,
    process: { env },
    fetch: fetchMock,
    console: { warn() {}, log() {} },
    require(name) {
      if (name in mocks) return mocks[name]
      if (name === 'date-fns') return nodeRequire(name)
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  return loadedModule.exports
}

const smsParams = {
  to: '+1 (202) 555-0123',
  scheduleId: 'SCH-123',
  type: 'confirmed',
  scheduledAt: '2026-01-02T10:00:00Z',
}

test('TextBee sends a normalized number to the documented endpoint and returns its real batch ID', async () => {
  let request
  const sms = load('src/lib/sms.ts', {}, { TEXTBEE_API_KEY: 'test-key', TEXTBEE_DEVICE_ID: 'device-1' },
    async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({ data: { success: true, smsBatchId: 'batch-1' } }) }
    })
  const result = await sms.sendSmsNotification(smsParams)
  assert.equal(result.success, true)
  assert.equal(result.messageId, 'batch-1')
  assert.equal(request.url, 'https://api.textbee.dev/api/v1/gateway/send-sms')
  assert.equal(request.options.headers['x-api-key'], 'test-key')
  const body = JSON.parse(request.options.body)
  assert.equal(body.recipients[0], '+12025550123')
  assert.equal(body.deviceId, 'device-1')
  assert.match(body.message, /SCH-123/)
})

test('TextBee does not simulate or claim success for invalid inputs and failed responses', async () => {
  let requests = 0
  let response = { ok: false, status: 400, json: async () => ({ message: 'No enabled device' }) }
  const sms = load('src/lib/sms.ts', {}, { TEXTBEE_API_KEY: 'test-key' },
    async () => { requests++; return response })
  assert.equal((await sms.sendSmsNotification({ ...smsParams, to: 'invalid' })).success, false)
  assert.equal(requests, 0)
  assert.equal((await sms.sendSmsNotification(smsParams)).error, 'No enabled device')
  response = { ok: true, json: async () => ({ data: { success: false } }) }
  assert.equal((await sms.sendSmsNotification(smsParams)).success, false)
  response = { ok: true, json: async () => ({ data: { success: true } }) }
  assert.equal((await sms.sendSmsNotification(smsParams)).success, false)
  response = { ok: true, json: async () => ({ data: { successCount: 1, failureCount: 0 } }) }
  assert.equal((await sms.sendSmsNotification(smsParams)).success, true)
  response = { ok: true, json: async () => ({ data: { successCount: 0, failureCount: 1 } }) }
  assert.equal((await sms.sendSmsNotification(smsParams)).success, false)
  response = { ok: true, json: async () => ({ data: { success: true, smsBatchId: 'batch-1', warning: { message: 'SMS permission missing' } } }) }
  assert.equal((await sms.sendSmsNotification(smsParams)).warning, 'SMS permission missing')
  const unconfigured = load('src/lib/sms.ts', {}, {}, async () => { throw new Error('unexpected request') })
  const result = await unconfigured.sendSmsNotification(smsParams)
  assert.equal(result.success, false)
  assert.match(result.error, /TEXTBEE_API_KEY/)
})

function notificationFixture({ preferences = { email: true, sms: true }, profileError = null, authError = null, resendResponse = { data: { id: 'email-1' }, error: null }, env = {} } = {}) {
  const sent = { email: [], sms: [] }
  class Resend {
    emails = { send: async (message) => { sent.email.push(message); return resendResponse } }
  }
  const template = () => '<p>Appointment</p>'
  const notifications = load('src/lib/notifications.ts', {
    resend: { Resend },
    './email-templates': {
      formatScheduleId: () => 'SCH-123',
      getConfirmationEmailHtml: template,
      getRescheduledEmailHtml: template,
      getDoctorUnavailableEmailHtml: template,
      getCancelledEmailHtml: template,
      getReminderEmailHtml: template,
    },
    './sms': { sendSmsNotification: async (params) => { sent.sms.push(params); return { success: true, messageId: 'batch-1' } } },
    '@supabase/supabase-js': { createClient: () => ({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: preferences ? { notification_preferences: preferences } : null, error: profileError }) }) }) }),
      auth: { admin: { getUserById: async () => ({ data: { user: null }, error: authError }) } },
    }) },
  }, {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_EMAIL: 'AppointCare <appointments@example.test>',
    ...env,
  })
  const payload = {
    type: 'confirmed', appointmentId: 'appointment-1', patientUserId: 'patient-1',
    patientEmail: 'patient@example.test', patientPhone: '+12025550123', scheduledAt: '2026-01-02T10:00:00Z',
  }
  return { sent, dispatch: () => notifications.dispatchAutomatedNotifications(payload) }
}

test('notifications send through Resend and TextBee and respect patient preferences', async () => {
  const all = notificationFixture()
  const result = await all.dispatch()
  assert.equal(result.email.sent, true)
  assert.equal(result.sms.sent, true)
  assert.equal(all.sent.email[0].to, 'patient@example.test')
  assert.equal(all.sent.sms[0].to, '+12025550123')

  const optedOut = notificationFixture({ preferences: { email: false, sms: false } })
  const skipped = await optedOut.dispatch()
  assert.equal(skipped.email.skipped, true)
  assert.equal(skipped.sms.skipped, true)
  assert.equal(optedOut.sent.email.length, 0)
  assert.equal(optedOut.sent.sms.length, 0)
})

test('notifications surface Resend errors and refuse delivery if preferences cannot be checked', async () => {
  const failed = notificationFixture({ resendResponse: { data: null, error: { message: 'Domain not verified' } } })
  const result = await failed.dispatch()
  assert.equal(result.email.sent, false)
  assert.equal(result.email.error, 'Domain not verified')
  assert.equal(result.sms.sent, true)

  const unconfigured = notificationFixture({ env: { RESEND_API_KEY: '' } })
  assert.equal((await unconfigured.dispatch()).email.sent, false)
  assert.equal(unconfigured.sent.email.length, 0)

  const unavailable = notificationFixture({ preferences: null, profileError: { message: 'failed' }, authError: { message: 'failed' } })
  const blocked = await unavailable.dispatch()
  assert.match(blocked.email.error, /preferences/)
  assert.match(blocked.sms.error, /preferences/)
  assert.equal(unavailable.sent.email.length, 0)
  assert.equal(unavailable.sent.sms.length, 0)
})

test('notification summaries distinguish acceptance, skips, failures and provider warnings', () => {
  const { describeNotificationStatus, notificationsAccepted } = load('src/lib/notification-status.ts', {}, {})
  const status = {
    email: { sent: true },
    sms: { sent: true, warning: 'SMS permission missing' },
  }
  assert.equal(notificationsAccepted(status), false)
  assert.match(describeNotificationStatus(status), /SMS permission missing/)
  assert.match(describeNotificationStatus(status), /delivery is not confirmed/)
  assert.match(describeNotificationStatus({ email: { sent: false, skipped: true, error: 'Disabled' }, sms: { sent: false, error: 'Unavailable' } }), /skipped \(Disabled\).*failed \(Unavailable\)/)
})
