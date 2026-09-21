import { NextResponse } from 'next/server'
import { sendSmsNotification } from '@/lib/sms'
import { formatScheduleId } from '@/lib/email-templates'

export async function POST(request: Request) {
  try {
    const { to, scheduleId, type = 'reminder', patientName, clinicName, doctorName, scheduledAt, reason } = await request.json()

    if (!to || !scheduledAt) {
      return NextResponse.json(
        { error: 'Recipient phone and scheduled date/time are required.' },
        { status: 400 }
      )
    }

    const formattedScheduleId = formatScheduleId(scheduleId || `SCH-${Date.now()}`)
    const result = await sendSmsNotification({
      to,
      scheduleId: formattedScheduleId,
      type,
      patientName,
      clinicName,
      doctorName,
      scheduledAt,
      reason,
    })

    return NextResponse.json({
      success: result.success,
      scheduleId: formattedScheduleId,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
