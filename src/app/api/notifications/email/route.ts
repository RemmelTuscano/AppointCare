import { NextResponse } from 'next/server'
import {
  formatScheduleId,
  getConfirmationEmailHtml,
  getRescheduledEmailHtml,
  getDoctorUnavailableEmailHtml,
  getReminderEmailHtml,
} from '@/lib/email-templates'

export async function POST() {
  return NextResponse.json({ error: 'Direct email sending is not available.' }, { status: 410 })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'confirmed'
  const scheduleId = formatScheduleId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  const scheduledAt = new Date(Date.now() + 86400000 * 2).toISOString()
  const common = {
    scheduleId,
    patientName: 'Jane Doe',
    clinicName: 'Metro General Health Clinic',
    clinicAddress: '123 Medical Parkway, Suite 400',
    doctorName: 'Sarah Jenkins',
    scheduledAt,
  }
  const html = type === 'rescheduled'
    ? getRescheduledEmailHtml({ ...common, oldScheduledAt: new Date(Date.now() + 86400000).toISOString(), reason: 'Doctor schedule rebalancing by clinic staff' })
    : type === 'doctor_unavailable'
      ? getDoctorUnavailableEmailHtml({ ...common, rescheduleUrl: '/patient/appointments' })
      : type === 'reminder'
        ? getReminderEmailHtml(common)
        : getConfirmationEmailHtml({ ...common, isPending: type === 'pending' || type === 'created' })

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
