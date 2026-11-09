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

export async function sendSmsNotification(params: SMSParams): Promise<{ success: boolean; messageId?: string; warning?: string; error?: string }> {
  const body = generateSmsMessage(params)

  const apiKey = process.env.TEXTBEE_API_KEY?.trim()
  const hasApiKey = Boolean(apiKey && !apiKey.startsWith('your_') && !apiKey.includes('placeholder'))
  const deviceId = process.env.TEXTBEE_DEVICE_ID?.trim()
  const phone = params.to.trim().replace(/[\s().-]/g, '')

  if (!/^\+?\d+$/.test(phone)) {
    return { success: false, error: 'Recipient phone number is invalid. Include the country code when needed.' }
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
          recipients: [phone],
          message: body,
          ...(deviceId ? { deviceId } : {}),
        }),
      })

      const data: unknown = await res.json()
      const response = data && typeof data === 'object' ? data as Record<string, unknown> : null

      if (!res.ok) {
        console.warn('TextBee SMS request failed with status:', res.status)
        const detail = typeof response?.message === 'string' ? response.message : 'TextBee request failed.'
        return { success: false, error: detail }
      }

      const result = response?.data && typeof response.data === 'object'
        ? response.data as Record<string, unknown> : null
      const queued = result?.success === true && typeof result.smsBatchId === 'string' && Boolean(result.smsBatchId)
      const sentImmediately = result?.successCount === 1 && result.failureCount === 0
      if (!queued && !sentImmediately) {
        console.warn('TextBee returned an invalid send response.')
        return { success: false, error: 'TextBee did not confirm the SMS request.' }
      }

      const warning = result?.warning && typeof result.warning === 'object'
        ? result.warning as Record<string, unknown> : null
      return {
        success: true,
        messageId: typeof result?.smsBatchId === 'string' ? result.smsBatchId : undefined,
        warning: typeof warning?.message === 'string' ? warning.message : undefined,
      }
    } catch (err: unknown) {
      console.warn('TextBee fetch exception:', err)
      return { success: false, error: 'TextBee request failed. Check the server logs.' }
    }
  }

  return { success: false, error: 'TEXTBEE_API_KEY is not configured.' }
}
