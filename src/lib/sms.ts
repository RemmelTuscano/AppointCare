import { format } from 'date-fns'

interface SMSParams {
  to: string
  scheduleId: string
  type: 'created' | 'confirmed' | 'rescheduled' | 'doctor_unavailable' | 'cancelled' | 'reminder'
  patientName?: string | null
  clinicName?: string | null
  doctorName?: string | null
  scheduledAt: string | Date
  reason?: string | null
}

export function generateSmsMessage({
  scheduleId,
  type,
  patientName,
  clinicName,
  doctorName,
  scheduledAt,
  reason,
}: SMSParams): string {
  const dateStr = format(new Date(scheduledAt), 'MMM d, yyyy h:mm a')
  const greeting = patientName ? `Hi ${patientName}` : 'Hello'

  switch (type) {
    case 'created':
      return `[AppointCare] ${greeting}, your appointment request at ${clinicName || 'Clinic'} is received! Ref #${scheduleId} for ${dateStr} with Dr. ${doctorName || 'Assigned Doctor'}. We will notify you once confirmed.`
    case 'confirmed':
      return `[AppointCare] ${greeting}, your appointment (Ref #${scheduleId}) at ${clinicName || 'Clinic'} on ${dateStr} with Dr. ${doctorName || 'Doctor'} is CONFIRMED. Please arrive 10 min early.`
    case 'doctor_unavailable':
      return `[AppointCare] NOTICE: Dr. ${doctorName || 'Doctor'} is unavailable for your visit on ${dateStr} (Ref #${scheduleId}). The clinic is currently rescheduling your appointment and will notify you shortly with the new time.`
    case 'rescheduled':
      return `[AppointCare] ${greeting}, your appointment (Ref #${scheduleId}) has been RESCHEDULED to ${dateStr} with Dr. ${doctorName || 'Doctor'} at ${clinicName || 'Clinic'}.`
    case 'cancelled':
      return `[AppointCare] Notice: Your appointment (Ref #${scheduleId}) at ${clinicName || 'Clinic'} for ${dateStr} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`
    case 'reminder':
      return `[AppointCare] REMINDER: You have an upcoming appointment (Ref #${scheduleId}) at ${clinicName || 'Clinic'} on ${dateStr} with Dr. ${doctorName || 'Doctor'}.`
    default:
      return `[AppointCare] Update on appointment Ref #${scheduleId} on ${dateStr}.`
  }
}

export async function sendSmsNotification(params: SMSParams): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const body = generateSmsMessage(params)

  const apiKey = process.env.TEXTBEE_API_KEY
  const hasApiKey = Boolean(apiKey && !apiKey.startsWith('your_') && !apiKey.includes('placeholder'))

  if (!params.to.trim()) {
    return { success: false, error: 'Recipient phone number is missing.' }
  }

  if (hasApiKey && apiKey) {
    try {
      const res = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          recipients: [params.to],
          message: body,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.warn('TextBee SMS delivery error:', data)
        return { success: false, error: data.message || data.error || 'TextBee send failed', simulated: false }
      }

      return { success: true, messageId: data.smsBatchId || `textbee_${Date.now()}`, simulated: false }
    } catch (err: unknown) {
      console.warn('TextBee fetch exception:', err)
      return { success: false, error: err instanceof Error ? err.message : 'TextBee request failed', simulated: false }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return { success: false, error: 'TEXTBEE_API_KEY is not configured.' }
  }

  // Graceful simulation / dev mode logging
  console.log(`[SMS Automation] -> Sent to ${params.to || 'patient phone'}: "${body}"`)
  return {
    success: true,
    messageId: `sim_sms_${Date.now()}`,
    simulated: true,
  }
}
