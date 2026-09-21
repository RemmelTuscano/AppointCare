import { Resend } from 'resend'
import {
  formatScheduleId,
  getConfirmationEmailHtml,
  getRescheduledEmailHtml,
  getDoctorUnavailableEmailHtml,
  getReminderEmailHtml,
} from './email-templates'
import { sendSmsNotification } from './sms'
import { createClient } from '@supabase/supabase-js'

export { formatScheduleId }

export interface NotificationPayload {
  type: 'created' | 'confirmed' | 'rescheduled' | 'doctor_unavailable' | 'cancelled' | 'reminder'
  appointmentId: string
  patientEmail?: string | null
  patientPhone?: string | null
  patientName?: string | null
  patientUserId?: string
  clinicUserId?: string
  clinicName?: string | null
  clinicAddress?: string | null
  clinicPhone?: string | null
  doctorName?: string | null
  doctorSpecialization?: string | null
  scheduledAt: string | Date
  oldScheduledAt?: string | Date
  notes?: string | null
  reason?: string | null
  rescheduleUrl?: string
}

export interface DispatchResult {
  email: { sent: boolean; error?: string; simulated?: boolean }
  sms: { sent: boolean; messageId?: string; simulated?: boolean; error?: string }
  scheduleId: string
  inAppNotifications: Array<{ userId: string; title: string; message: string }>
}

export async function dispatchAutomatedNotifications(
  payload: NotificationPayload
): Promise<DispatchResult> {
  const scheduleId = formatScheduleId(payload.appointmentId)
  const result: DispatchResult = {
    email: { sent: false },
    sms: { sent: false },
    scheduleId,
    inAppNotifications: [],
  }

  // 1. Generate Email HTML & Subject
  let emailSubject = ''
  let emailHtml = ''

  switch (payload.type) {
    case 'created':
      emailSubject = `Appointment Request Received [${scheduleId}] - ${payload.clinicName || 'AppointCare'}`
      emailHtml = getConfirmationEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        clinicAddress: payload.clinicAddress,
        clinicPhone: payload.clinicPhone,
        doctorName: payload.doctorName,
        doctorSpecialization: payload.doctorSpecialization,
        scheduledAt: payload.scheduledAt,
        notes: payload.notes,
        isPending: true,
      })
      break

    case 'confirmed':
      emailSubject = `Appointment Confirmed [${scheduleId}] - ${payload.clinicName || 'AppointCare'}`
      emailHtml = getConfirmationEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        clinicAddress: payload.clinicAddress,
        clinicPhone: payload.clinicPhone,
        doctorName: payload.doctorName,
        doctorSpecialization: payload.doctorSpecialization,
        scheduledAt: payload.scheduledAt,
        notes: payload.notes,
        isPending: false,
      })
      break

    case 'rescheduled':
      emailSubject = `Appointment Rescheduled [${scheduleId}] - ${payload.clinicName || 'AppointCare'}`
      emailHtml = getRescheduledEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        clinicAddress: payload.clinicAddress,
        doctorName: payload.doctorName,
        doctorSpecialization: payload.doctorSpecialization,
        oldScheduledAt: payload.oldScheduledAt,
        scheduledAt: payload.scheduledAt,
        reason: payload.reason,
      })
      break

    case 'doctor_unavailable':
      emailSubject = `Action Needed: Doctor Unavailable for Appointment [${scheduleId}] - ${payload.clinicName || 'AppointCare'}`
      emailHtml = getDoctorUnavailableEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        doctorName: payload.doctorName,
        scheduledAt: payload.scheduledAt,
        rescheduleUrl: payload.rescheduleUrl || '/patient/appointments',
      })
      break

    case 'reminder':
      emailSubject = `Appointment Reminder [${scheduleId}] - ${payload.clinicName || 'AppointCare'}`
      emailHtml = getReminderEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        clinicAddress: payload.clinicAddress,
        doctorName: payload.doctorName,
        scheduledAt: payload.scheduledAt,
      })
      break

    default:
      emailSubject = `Appointment Update [${scheduleId}] - AppointCare`
      emailHtml = getConfirmationEmailHtml({
        scheduleId,
        patientName: payload.patientName,
        clinicName: payload.clinicName,
        doctorName: payload.doctorName,
        scheduledAt: payload.scheduledAt,
        notes: payload.notes,
        isPending: false,
      })
  }

  // 2. Dispatch Email
  if (payload.patientEmail) {
    const apiKey = process.env.RESEND_API_KEY
    const isRealKey = apiKey && !apiKey.startsWith('your_') && !apiKey.includes('placeholder') && apiKey !== 're_123456789'

    if (isRealKey) {
      try {
        const resend = new Resend(apiKey)
        const { error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'AppointCare <onboarding@resend.dev>',
          to: payload.patientEmail,
          subject: emailSubject,
          html: emailHtml,
        })
        if (error) {
          result.email = { sent: false, error: error.message }
        } else {
          result.email = { sent: true }
        }
      } catch (err: unknown) {
        result.email = { sent: false, error: err instanceof Error ? err.message : 'Email delivery failed' }
      }
    } else {
      console.log(`[Email Automation Simulator] To: ${payload.patientEmail} | Subject: "${emailSubject}" | Ref: ${scheduleId}`)
      result.email = { sent: true, simulated: true }
    }
  }

  // 3. Dispatch SMS only when the patient has opted in.
  let smsEnabled = true
  if (payload.patientUserId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: profile } = await supabase.from('profiles').select('notification_preferences').eq('id', payload.patientUserId).maybeSingle()
    const { data: authUser } = await supabase.auth.admin.getUserById(payload.patientUserId)
    const preferences = profile?.notification_preferences || authUser.user?.user_metadata?.notification_preferences
    smsEnabled = preferences?.sms !== false
  }

  if (smsEnabled && (payload.patientPhone || payload.patientEmail)) {
    const smsRes = await sendSmsNotification({
      to: payload.patientPhone || 'Simulated-Phone',
      scheduleId,
      type: payload.type,
      patientName: payload.patientName,
      clinicName: payload.clinicName,
      doctorName: payload.doctorName,
      scheduledAt: payload.scheduledAt,
      reason: payload.reason,
    })
    result.sms = {
      sent: smsRes.success,
      messageId: smsRes.messageId,
      simulated: smsRes.simulated,
      error: smsRes.error,
    }
  }

  // 4. In-App Notifications structures
  if (payload.patientUserId) {
    let patientTitle = ''
    let patientMsg = ''

    if (payload.type === 'created') {
      patientTitle = `Appointment Request Sent (${scheduleId})`
      patientMsg = `Your appointment request for ${payload.clinicName || 'the clinic'} has been received and is pending confirmation.`
    } else if (payload.type === 'confirmed') {
      patientTitle = `Appointment Confirmed (${scheduleId})`
      patientMsg = `Your visit at ${payload.clinicName || 'the clinic'} with Dr. ${payload.doctorName || 'Assigned Doctor'} is confirmed.`
    } else if (payload.type === 'doctor_unavailable') {
      patientTitle = `Doctor Unavailable Notice (${scheduleId})`
      patientMsg = `Dr. ${payload.doctorName || 'Doctor'} is currently unavailable. The clinic is arranging a reschedule or doctor reassignment and will notify you with the updated time.`
    } else if (payload.type === 'rescheduled') {
      patientTitle = `Appointment Rescheduled (${scheduleId})`
      patientMsg = `Your appointment with Dr. ${payload.doctorName || 'Doctor'} at ${payload.clinicName || 'the clinic'} is updated.`
    } else if (payload.type === 'cancelled') {
      patientTitle = `Appointment Cancelled (${scheduleId})`
      patientMsg = `Your appointment at ${payload.clinicName || 'the clinic'} was cancelled.`
    }

    if (patientTitle) {
      result.inAppNotifications.push({
        userId: payload.patientUserId,
        title: patientTitle,
        message: patientMsg,
      })
    }
  }

  if (payload.clinicUserId && (payload.type === 'created' || payload.type === 'rescheduled')) {
    result.inAppNotifications.push({
      userId: payload.clinicUserId,
      title: payload.type === 'created' ? `New Booking Request (${scheduleId})` : `Appointment Rescheduled (${scheduleId})`,
      message: `${payload.patientName || payload.patientEmail || 'A patient'} ${payload.type === 'created' ? 'requested an appointment' : 'rescheduled their appointment'} (Ref: ${scheduleId}).`,
    })
  }

  return result
}
