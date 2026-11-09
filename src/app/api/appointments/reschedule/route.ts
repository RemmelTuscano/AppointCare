import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchAutomatedNotifications } from '@/lib/notifications'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { recordActivity } from '@/lib/activity'

type RelatedPerson = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

type RelatedClinic = {
  user_id?: string | null
  name?: string | null
  address?: string | null
}

type RelatedDoctor = {
  name?: string | null
  specialization?: string | null
  is_available?: boolean | null
}

export async function POST(request: Request) {
  try {
    const sessionClient = await createServerClient()
    if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })
    const { data: { user: actor }, error: authError } = await sessionClient.auth.getUser()
    if (authError || !actor) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

    const { appointmentId, newScheduledAt, newDoctorId, reason } = await request.json()

    if (typeof appointmentId !== 'string' || typeof newScheduledAt !== 'string' ||
        (newDoctorId != null && typeof newDoctorId !== 'string') ||
        (reason != null && typeof reason !== 'string')) {
      return NextResponse.json(
        { error: 'appointmentId and newScheduledAt are required.' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(newScheduledAt)
    if (Number.isNaN(scheduledDate.getTime())) return NextResponse.json({ error: 'Invalid appointment time.' }, { status: 400 })
    const supabase = createAdminClient()
    if (!supabase) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })
    const { data: ownedClinic, error: clinicError } = await supabase
      .from('clinics').select('id').eq('user_id', actor.id).maybeSingle()
    if (clinicError) {
      console.error('Unable to verify clinic ownership:', clinicError.message)
      return NextResponse.json({ error: 'Unable to verify clinic access.' }, { status: 500 })
    }
    if (!ownedClinic) return NextResponse.json({ error: 'Only clinic owners can reschedule appointments.' }, { status: 403 })

    // Fetch existing appointment details
    const { data: existingApt, error: fetchErr } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        clinic_id,
        doctor_id,
        scheduled_at,
        notes,
        status,
        patient:profiles(id, full_name, email, phone),
        clinic:clinics(id, user_id, name, address, phone),
        doctor:doctors(id, name, specialization, is_available)
      `)
      .eq('id', appointmentId)
      .eq('clinic_id', ownedClinic.id)
      .single()

    if (fetchErr || !existingApt) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
    }

    // Build update payload
    const updatePayload: Record<string, string> = {
      scheduled_at: scheduledDate.toISOString(),
      status: 'confirmed',
    }

    if (newDoctorId) {
      const { data: doctor, error: doctorError } = await supabase.from('doctors')
        .select('id, is_available').eq('id', newDoctorId).eq('clinic_id', ownedClinic.id).maybeSingle()
      if (doctorError) {
        console.error('Unable to verify doctor:', doctorError.message)
        return NextResponse.json({ error: 'Unable to verify doctor.' }, { status: 500 })
      }
      if (!doctor?.is_available) return NextResponse.json({ error: 'Doctor is unavailable at this clinic.' }, { status: 400 })
      updatePayload.doctor_id = newDoctorId
    }

    if (reason) {
      updatePayload.notes = existingApt.notes ? `${existingApt.notes}\n[Rescheduled by Clinic: ${reason}]` : `[Rescheduled by Clinic: ${reason}]`
    }

    const { data: updatedApt, error: updateErr } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', appointmentId)
      .eq('clinic_id', ownedClinic.id)
      .select(`
        id,
        patient_id,
        clinic_id,
        doctor_id,
        scheduled_at,
        notes,
        status,
        patient:profiles(id, full_name, email, phone),
        clinic:clinics(id, user_id, name, address, phone),
        doctor:doctors(id, name, specialization, is_available)
      `)
      .single()

    if (updateErr || !updatedApt) {
      return NextResponse.json({ error: updateErr?.message || 'Failed to update appointment' }, { status: 500 })
    }

    const patientData = updatedApt.patient as RelatedPerson
    const clinicData = updatedApt.clinic as RelatedClinic
    const doctorData = updatedApt.doctor as RelatedDoctor
    await recordActivity({
      actorId: actor.id,
      action: 'appointment_rescheduled',
      entityType: 'appointment',
      entityId: updatedApt.id,
      summary: `Appointment for ${patientData?.full_name || 'patient'} was rescheduled`,
      metadata: {
        clinic: clinicData?.name,
        doctor: doctorData?.name,
        scheduledAt: updatedApt.scheduled_at,
        reason: reason || null,
      },
    })

    // Dispatch automated Email, SMS, and in-app notifications with Schedule ID
    const notificationResult = await dispatchAutomatedNotifications({
      type: 'rescheduled',
      appointmentId: updatedApt.id,
      patientEmail: patientData?.email,
      patientPhone: patientData?.phone,
      patientName: patientData?.full_name,
      patientUserId: updatedApt.patient_id,
      clinicUserId: clinicData?.user_id ?? undefined,
      clinicName: clinicData?.name,
      clinicAddress: clinicData?.address,
      doctorName: doctorData?.name,
      doctorSpecialization: doctorData?.specialization,
      oldScheduledAt: existingApt.scheduled_at,
      scheduledAt: updatedApt.scheduled_at,
      reason: reason || 'Clinic adjustment due to schedule or doctor availability',
    })

    // Store in-app notification
    if (notificationResult.inAppNotifications.length > 0) {
      for (const item of notificationResult.inAppNotifications) {
        await supabase.from('notifications').insert({
          user_id: item.userId,
          type: 'in_app',
          title: item.title,
          message: item.message,
          metadata: {
            appointment_id: updatedApt.id,
            schedule_id: notificationResult.scheduleId,
            event: 'rescheduled',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      appointment: updatedApt,
      scheduleId: notificationResult.scheduleId,
      notifications: notificationResult,
    })
  } catch (err) {
    console.error('Rescheduling failed:', err)
    return NextResponse.json(
      { error: 'Rescheduling failed.' },
      { status: 500 }
    )
  }
}
