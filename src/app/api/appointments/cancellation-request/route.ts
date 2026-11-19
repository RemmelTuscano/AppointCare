import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { dispatchAutomatedNotifications, storeInAppNotifications, type DispatchResult } from '@/lib/notifications'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ReviewedAppointment = {
  id: string
  status: string
  cancellation_request_status: string
  cancellation_request_reason: string
  patient_id: string
  scheduled_at: string
  patient: { full_name: string | null; email: string | null; phone: string | null } | null
  clinic: { user_id: string; name: string; address: string; phone: string | null } | null
  doctor: { name: string; specialization: string | null } | null
}

async function getContext() {
  const sessionClient = await createClient()
  if (!sessionClient) return { error: NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 }) }
  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }) }
  const admin = createAdminClient()
  if (!admin) return { error: NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 }) }
  return { user, admin }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const context = await getContext()
  if (context.error) return context.error

  const body = await readBody(request)
  if (typeof body?.appointmentId !== 'string' || !UUID.test(body.appointmentId) ||
      typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) {
    return NextResponse.json({ error: 'A valid appointment and a cancellation reason of up to 1000 characters are required.' }, { status: 400 })
  }

  const { data, error } = await context.admin.from('appointments')
    .update({ cancellation_request_status: 'pending', cancellation_request_reason: body.reason.trim() })
    .eq('id', body.appointmentId)
    .eq('patient_id', context.user.id)
    .in('status', ['pending', 'confirmed'])
    .or('cancellation_request_status.is.null,cancellation_request_status.eq.declined')
    .select('id, cancellation_request_status, cancellation_request_reason')
    .maybeSingle()

  if (error) {
    console.error('Failed to submit cancellation request:', error.message)
    return NextResponse.json({ error: 'Could not submit the cancellation request. Please try again.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'This appointment cannot accept a cancellation request. Please refresh the page.' }, { status: 409 })
  return NextResponse.json({ appointment: data })
}

export async function PATCH(request: Request) {
  const context = await getContext()
  if (context.error) return context.error

  const body = await readBody(request)
  if (typeof body?.appointmentId !== 'string' || !UUID.test(body.appointmentId) ||
      (body.decision !== 'approved' && body.decision !== 'declined')) {
    return NextResponse.json({ error: 'A valid appointment and decision are required.' }, { status: 400 })
  }

  const { data: clinic, error: clinicError } = await context.admin.from('clinics')
    .select('id').eq('user_id', context.user.id).maybeSingle()
  if (clinicError) {
    console.error('Failed to verify clinic ownership:', clinicError.message)
    return NextResponse.json({ error: 'Could not verify clinic access.' }, { status: 500 })
  }
  if (!clinic) return NextResponse.json({ error: 'Only the clinic can review cancellation requests.' }, { status: 403 })

  const update = body.decision === 'approved'
    ? { cancellation_request_status: 'approved', status: 'cancelled' }
    : { cancellation_request_status: 'declined' }
  const { data, error } = await context.admin.from('appointments')
    .update(update)
    .eq('id', body.appointmentId)
    .eq('clinic_id', clinic.id)
    .eq('cancellation_request_status', 'pending')
    .in('status', ['pending', 'confirmed'])
    .select('id, status, cancellation_request_status, cancellation_request_reason, patient_id, scheduled_at, patient:profiles(full_name, email, phone), clinic:clinics(user_id, name, address, phone), doctor:doctors(name, specialization)')
    .maybeSingle().overrideTypes<ReviewedAppointment, { merge: false }>()

  if (error) {
    console.error('Failed to review cancellation request:', error.message)
    return NextResponse.json({ error: 'Could not review the cancellation request. Please try again.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'This cancellation request is no longer available. Please refresh the page.' }, { status: 409 })

  let notifications: DispatchResult | null = null
  let notificationError: string | null = null
  if (body.decision === 'approved') {
    try {
      notifications = await dispatchAutomatedNotifications({
        type: 'cancelled',
        cancellationRequestApproved: true,
        appointmentId: data.id,
        patientUserId: data.patient_id,
        patientEmail: data.patient?.email,
        patientPhone: data.patient?.phone,
        patientName: data.patient?.full_name,
        clinicUserId: data.clinic?.user_id,
        clinicName: data.clinic?.name,
        clinicAddress: data.clinic?.address,
        clinicPhone: data.clinic?.phone,
        doctorName: data.doctor?.name,
        doctorSpecialization: data.doctor?.specialization,
        scheduledAt: data.scheduled_at,
      })
      await storeInAppNotifications(context.admin, data.id, 'cancelled', notifications)
    } catch (error) {
      console.error('Cancellation approved, but notifications could not be completed:', error)
      notificationError = 'Notification delivery could not be completed. Please contact the patient.'
    }
  }

  return NextResponse.json({
    appointment: {
      id: data.id,
      status: data.status,
      cancellation_request_status: data.cancellation_request_status,
      cancellation_request_reason: data.cancellation_request_reason,
    },
    notifications: notifications ? { email: notifications.email, sms: notifications.sms } : null,
    notificationError,
  })
}
