import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchAutomatedNotifications } from '@/lib/notifications'

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database is not configured for automated reminders.' }, { status: 500 })
  }

  const supabase = createClient(url, serviceRoleKey)

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: any[] = []

  for (const apt of (appointments || [])) {
    const patientData = apt.patient as any
    const clinicData = apt.clinic as any
    const doctorData = apt.doctor as any

    const dispatchResult = await dispatchAutomatedNotifications({
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

    results.push({
      appointmentId: apt.id,
      scheduleId: dispatchResult.scheduleId,
      patient: patientData?.email,
      emailSent: dispatchResult.email.sent,
      smsSent: dispatchResult.sms.sent,
    })
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    reminders: results,
  })
}
