import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { dispatchAutomatedNotifications } from '@/lib/notifications'

type Person = { full_name: string | null; email: string | null; phone: string | null }
type Clinic = { user_id: string; name: string; address: string; phone: string | null }
type Doctor = { name: string; specialization: string | null; is_available: boolean } | null
type DispatchType = 'created' | 'confirmed' | 'cancelled' | 'doctor_unavailable'
type Appointment = {
  id: string
  patient_id: string
  scheduled_at: string
  status: string
  notes: string | null
  patient: Person | null
  clinic: Clinic | null
  doctor: Doctor
}

function isDispatchType(value: unknown): value is DispatchType {
  return value === 'created' || value === 'confirmed' || value === 'cancelled' || value === 'doctor_unavailable'
}

export async function POST(request: Request) {
  const sessionClient = await createClient()
  if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })
  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  let body: { appointmentId?: unknown; type?: unknown }
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object') return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    body = parsed
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof body.appointmentId !== 'string' || !isDispatchType(body.type)) {
    return NextResponse.json({ error: 'Invalid appointment or notification type.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })
  const { data: appointment, error } = await admin.from('appointments')
    .select('id, patient_id, scheduled_at, status, notes, patient:profiles(full_name, email, phone), clinic:clinics(user_id, name, address, phone), doctor:doctors(name, specialization, is_available)')
    .eq('id', body.appointmentId).maybeSingle().overrideTypes<Appointment, { merge: false }>()
  if (error) {
    console.error('Notification appointment lookup failed:', error.message)
    return NextResponse.json({ error: 'Unable to load appointment.' }, { status: 500 })
  }
  if (!appointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })

  const { patient, clinic, doctor } = appointment
  const type = body.type
  const permitted = type === 'created'
    ? appointment.patient_id === user.id && appointment.status === 'pending'
    : clinic?.user_id === user.id && (
      (type === 'confirmed' && appointment.status === 'confirmed') ||
      (type === 'cancelled' && appointment.status === 'cancelled') ||
      (type === 'doctor_unavailable' && doctor?.is_available === false &&
        new Date(appointment.scheduled_at).getTime() >= Date.now() &&
        ['pending', 'confirmed'].includes(appointment.status))
    )
  if (!permitted || !clinic) return NextResponse.json({ error: 'You cannot send this notification.' }, { status: 403 })

  const result = await dispatchAutomatedNotifications({
    type,
    appointmentId: appointment.id,
    patientUserId: appointment.patient_id,
    patientEmail: patient?.email,
    patientPhone: patient?.phone,
    patientName: patient?.full_name,
    clinicUserId: clinic.user_id,
    clinicName: clinic.name,
    clinicAddress: clinic.address,
    clinicPhone: clinic.phone,
    doctorName: doctor?.name,
    doctorSpecialization: doctor?.specialization,
    scheduledAt: appointment.scheduled_at,
    notes: appointment.notes,
    reason: type === 'cancelled' ? 'Clinic could not accommodate this booking request.' : undefined,
  })

  if (result.inAppNotifications.length) {
    const { error: insertError } = await admin.from('notifications').insert(
      result.inAppNotifications.map((item) => ({
        user_id: item.userId,
        type: 'in_app',
        title: item.title,
        message: item.message,
        metadata: { appointment_id: appointment.id, schedule_id: result.scheduleId, event: type },
      }))
    )
    if (insertError) {
      console.error('Failed to store in-app notifications:', insertError.message)
      return NextResponse.json({ error: 'Notification delivery could not be completed.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, scheduleId: result.scheduleId, email: result.email, sms: result.sms })
}
