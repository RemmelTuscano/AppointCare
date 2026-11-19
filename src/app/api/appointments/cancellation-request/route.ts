import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    .select('id, status, cancellation_request_status, cancellation_request_reason')
    .maybeSingle()

  if (error) {
    console.error('Failed to review cancellation request:', error.message)
    return NextResponse.json({ error: 'Could not review the cancellation request. Please try again.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'This cancellation request is no longer available. Please refresh the page.' }, { status: 409 })
  return NextResponse.json({ appointment: data })
}
