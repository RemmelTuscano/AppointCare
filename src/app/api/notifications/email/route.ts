import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import {
  formatScheduleId,
  getConfirmationEmailHtml,
  getRescheduledEmailHtml,
  getDoctorUnavailableEmailHtml,
  getReminderEmailHtml,
} from '@/lib/email-templates'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      to,
      subject: customSubject,
      html: customHtml,
      appointmentId,
      scheduleId: inputScheduleId,
      type,
      patientName,
      clinicName,
      clinicAddress,
      clinicPhone,
      doctorName,
      doctorSpecialization,
      scheduledAt,
      oldScheduledAt,
      notes,
      reason,
      rescheduleUrl,
    } = body

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required.' }, { status: 400 })
    }

    const scheduleId = inputScheduleId || (appointmentId ? formatScheduleId(appointmentId) : 'SCH-APPOINTCARE')
    
    let subject = customSubject
    let html = customHtml

    // If a specific template type is requested or deduced
    if (!html && scheduledAt) {
      if (type === 'rescheduled') {
        subject = subject || `Appointment Rescheduled [${scheduleId}] - ${clinicName || 'AppointCare'}`
        html = getRescheduledEmailHtml({
          scheduleId,
          patientName,
          clinicName,
          clinicAddress,
          doctorName,
          doctorSpecialization,
          oldScheduledAt,
          scheduledAt,
          reason,
        })
      } else if (type === 'doctor_unavailable') {
        subject = subject || `Action Needed: Doctor Unavailable [${scheduleId}] - ${clinicName || 'AppointCare'}`
        html = getDoctorUnavailableEmailHtml({
          scheduleId,
          patientName,
          clinicName,
          doctorName,
          scheduledAt,
          rescheduleUrl,
        })
      } else if (type === 'reminder') {
        subject = subject || `Appointment Reminder [${scheduleId}] - ${clinicName || 'AppointCare'}`
        html = getReminderEmailHtml({
          scheduleId,
          patientName,
          clinicName,
          clinicAddress,
          doctorName,
          scheduledAt,
        })
      } else {
        const isPending = type === 'pending' || type === 'created'
        subject = subject || `Appointment ${isPending ? 'Request Received' : 'Confirmed'} [${scheduleId}] - ${clinicName || 'AppointCare'}`
        html = getConfirmationEmailHtml({
          scheduleId,
          patientName,
          clinicName,
          clinicAddress,
          clinicPhone,
          doctorName,
          doctorSpecialization,
          scheduledAt,
          notes,
          isPending,
        })
      }
    }

    if (!subject || !html) {
      return NextResponse.json({ error: 'Recipient, subject, and message are required.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const isPlaceholderKey = !apiKey || apiKey.startsWith('your_') || apiKey.includes('placeholder') || apiKey === 're_123456789'

    if (isPlaceholderKey) {
      console.log(`[Email Simulator Mode] To: ${to} | Subject: "${subject}" | Schedule: ${scheduleId}`)
      return NextResponse.json({
        success: true,
        simulated: true,
        scheduleId,
        message: 'Email simulated successfully. To deliver real emails to inboxes, add a valid RESEND_API_KEY from https://resend.com to your .env.local file.',
      })
    }

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'AppointCare <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    if (error) {
      console.warn(`[Resend Error]: ${error.message}`)
      return NextResponse.json({
        error: error.message,
        scheduleId,
        hint: error.message.includes('API key')
          ? 'Get a free API key at https://resend.com and add RESEND_API_KEY=re_... in .env.local'
          : error.message.includes('testing email') || error.message.includes('only send testing emails to your own email')
          ? 'On Resend free tier without a custom domain, you can only send test emails to your registered Resend account email address.'
          : undefined,
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, data, scheduleId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'confirmed'
  const sampleId = searchParams.get('id') || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const scheduleId = formatScheduleId(sampleId)

  let html = ''
  if (type === 'rescheduled') {
    html = getRescheduledEmailHtml({
      scheduleId,
      patientName: 'Jane Doe',
      clinicName: 'Metro General Health Clinic',
      clinicAddress: '123 Medical Parkway, Suite 400',
      doctorName: 'Sarah Jenkins',
      doctorSpecialization: 'Cardiology',
      oldScheduledAt: new Date(Date.now() + 86400000).toISOString(),
      scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      reason: 'Doctor schedule rebalancing by clinic staff',
    })
  } else if (type === 'doctor_unavailable') {
    html = getDoctorUnavailableEmailHtml({
      scheduleId,
      patientName: 'Jane Doe',
      clinicName: 'Metro General Health Clinic',
      doctorName: 'Sarah Jenkins',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      rescheduleUrl: '/patient/appointments',
    })
  } else if (type === 'reminder') {
    html = getReminderEmailHtml({
      scheduleId,
      patientName: 'Jane Doe',
      clinicName: 'Metro General Health Clinic',
      clinicAddress: '123 Medical Parkway, Suite 400',
      doctorName: 'Sarah Jenkins',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    })
  } else {
    html = getConfirmationEmailHtml({
      scheduleId,
      patientName: 'Jane Doe',
      clinicName: 'Metro General Health Clinic',
      clinicAddress: '123 Medical Parkway, Suite 400',
      clinicPhone: '+1 (555) 234-5678',
      doctorName: 'Sarah Jenkins',
      doctorSpecialization: 'Cardiology',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      notes: 'Routine cardiovascular checkup.',
      isPending: type === 'pending' || type === 'created',
    })
  }

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}