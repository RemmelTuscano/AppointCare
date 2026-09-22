import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const sessionClient = await createClient()
    if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })

    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in to book an appointment.' }, { status: 401 })

    const { clinicId, doctorId, scheduledAt, notes } = await request.json()
    if (!clinicId || !doctorId || !scheduledAt) {
      return NextResponse.json({ error: 'Clinic, doctor, and appointment time are required.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })

    const admin = createSupabaseClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: clinic, error: clinicError } = await admin.from('clinics').select('id').eq('id', clinicId).single()
    if (clinicError || !clinic) {
      console.warn('Appointment booking conflict: clinic unavailable', { clinicId })
      return NextResponse.json({ code: 'CLINIC_UNAVAILABLE', error: 'This clinic is no longer available. Please return to the clinic list and choose another clinic.' }, { status: 409 })
    }

    const { data: doctor, error: doctorError } = await admin.from('doctors').select('id, name, specialization, is_available').eq('id', doctorId).eq('clinic_id', clinicId).single()
    if (doctorError || !doctor || !doctor.is_available) {
      console.warn('Appointment booking conflict: doctor unavailable', { clinicId, doctorId })
      return NextResponse.json({ code: 'DOCTOR_UNAVAILABLE', error: 'This doctor is no longer available. Please choose another available doctor.' }, { status: 409 })
    }

    const appointmentDate = new Date(scheduledAt)
    if (Number.isNaN(appointmentDate.getTime())) return NextResponse.json({ error: 'The appointment date is invalid.' }, { status: 400 })

    const dayStart = new Date(appointmentDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    const { count, error: countError } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', dayStart.toISOString())
      .lt('scheduled_at', dayEnd.toISOString())

    if (countError) return NextResponse.json({ error: 'Unable to check clinic availability.' }, { status: 500 })
    const dailyCapacity = 10
    if ((count || 0) >= dailyCapacity) {
      console.warn('Appointment booking conflict: clinic capacity reached', { clinicId, scheduledAt, count, capacity: dailyCapacity })
      return NextResponse.json({ code: 'CLINIC_FULL', error: 'This clinic is fully booked for the selected date. Please choose another date or clinic.' }, { status: 409 })
    }

    const { data: appointment, error: bookingError } = await admin
      .from('appointments')
      .insert({ patient_id: user.id, clinic_id: clinicId, doctor_id: doctorId, scheduled_at: appointmentDate.toISOString(), notes: typeof notes === 'string' ? notes.trim() || null : null, status: 'pending' })
      .select('*')
      .single()

    if (bookingError || !appointment) return NextResponse.json({ error: bookingError?.message || 'Unable to create appointment.' }, { status: 500 })
    return NextResponse.json({ appointment, doctor })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create appointment.' }, { status: 500 })
  }
}
