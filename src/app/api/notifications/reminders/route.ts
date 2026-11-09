import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchAutomatedNotifications } from '@/lib/notifications'

export async function POST(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET
  if (!secret || secret.length < 32) {
    console.error('REMINDER_CRON_SECRET must be configured with at least 32 characters.')
    return NextResponse.json({ error: 'Reminder service is not configured.' }, { status: 500 })
  }
  const authorization = request.headers.get('authorization') || ''
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
  const received = createHash('sha256').update(authorization).digest()
  if (!timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database is not configured for automated reminders.' }, { status: 500 })
  }

  // Find upcoming confirmed appointments between now and next 48 hours
  const now = new Date()
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      clinic_id,
      doctor_id,
      scheduled_at,
      status,
      patient:profiles(id, full_name, email, phone),
      clinic:clinics(id, name, address, phone),
      doctor:doctors(id, name, specialization)
    `)
    .in('status', ['confirmed', 'pending'])
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in48Hours.toISOString())

  if (error) {
    console.error('Reminder appointment lookup failed:', error.message)
    return NextResponse.json({ error: 'Unable to load appointments for reminders.' }, { status: 500 })
  }

  let count = 0
  let failures = 0

  for (const apt of (appointments || [])) {
    const patientData = apt.patient as { email?: string | null; phone?: string | null; full_name?: string | null } | null
    const clinicData = apt.clinic as { name?: string | null; address?: string | null } | null
    const doctorData = apt.doctor as { name?: string | null } | null

    const result = await dispatchAutomatedNotifications({
      type: 'reminder',
      appointmentId: apt.id,
      patientEmail: patientData?.email,
      patientPhone: patientData?.phone,
      patientName: patientData?.full_name,
      patientUserId: apt.patient_id,
      clinicName: clinicData?.name,
      clinicAddress: clinicData?.address,
      doctorName: doctorData?.name,
      scheduledAt: apt.scheduled_at,
    })
    count++
    if ((!result.email.sent && !result.email.skipped) || (!result.sms.sent && !result.sms.skipped)) failures++
  }

  return NextResponse.json({
    success: failures === 0,
    count,
    failures,
  }, { status: failures ? 207 : 200, headers: { 'Cache-Control': 'private, no-store' } })
}
