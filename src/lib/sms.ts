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

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && fromNumber && params.to) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      
      const form = new URLSearchParams()
      form.append('From', fromNumber)
      form.append('To', params.to)
      form.append('Body', body)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      })

      const data = await res.json()
      if (!res.ok) {
        console.warn('Twilio SMS delivery error:', data)
        return { success: false, error: data.message || 'Twilio send failed', simulated: true }
      }

      return { success: true, messageId: data.sid, simulated: false }
    } catch (err: any) {
      console.warn('Twilio fetch exception:', err)
      return { success: false, error: err.message, simulated: true }
    }
  }

  // Graceful simulation / dev mode logging
  console.log(`[SMS Automation] -> Sent to ${params.to || 'patient phone'}: "${body}"`)
  return {
    success: true,
    messageId: `sim_sms_${Date.now()}`,
    simulated: true,
  }
}
