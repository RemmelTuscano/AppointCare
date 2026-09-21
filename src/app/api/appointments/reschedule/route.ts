import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchAutomatedNotifications } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const { appointmentId, newScheduledAt, newDoctorId, reason, initiatedBy } = await request.json()

    if (!appointmentId || !newScheduledAt) {
      return NextResponse.json(
        { error: 'appointmentId and newScheduledAt are required.' },
        { status: 400 }
      )
    }

    if (initiatedBy === 'patient') {
      return NextResponse.json(
        { error: 'Only clinic users can reschedule appointments. Please contact your clinic.' },
        { status: 403 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })
    }

    const supabase = createClient(url, serviceRoleKey)

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
      .single()

    if (fetchErr || !existingApt) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      scheduled_at: new Date(newScheduledAt).toISOString(),
      status: 'confirmed',
    }

    if (newDoctorId) {
      updatePayload.doctor_id = newDoctorId
    }

    if (reason) {
      updatePayload.notes = existingApt.notes ? `${existingApt.notes}\n[Rescheduled by Clinic: ${reason}]` : `[Rescheduled by Clinic: ${reason}]`
    }

    const { data: updatedApt, error: updateErr } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', appointmentId)
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

    const patientData = updatedApt.patient as any
    const clinicData = updatedApt.clinic as any
    const doctorData = updatedApt.doctor as any

    // Dispatch automated Email, SMS, and in-app notifications with Schedule ID
    const notificationResult = await dispatchAutomatedNotifications({
      type: 'rescheduled',
      appointmentId: updatedApt.id,
      patientEmail: patientData?.email,
      patientPhone: patientData?.phone,
      patientName: patientData?.full_name,
      patientUserId: updatedApt.patient_id,
      clinicUserId: clinicData?.user_id,
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Rescheduling failed' },
      { status: 500 }
    )
  }
}
