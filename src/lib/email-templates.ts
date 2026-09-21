import { format } from 'date-fns'

export function formatScheduleId(appointmentId: string): string {
  if (!appointmentId) return 'SCH-00000000'
  const clean = appointmentId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `SCH-${clean.slice(0, 8)}`
}

interface EmailBaseProps {
  scheduleId: string
  patientName?: string | null
  clinicName?: string | null
  clinicAddress?: string | null
  clinicPhone?: string | null
  doctorName?: string | null
  doctorSpecialization?: string | null
  scheduledAt: string | Date
  notes?: string | null
}

const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3fdf8; margin: 0; padding: 24px 12px; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.05); }
  .header { background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
  .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
  .tagline { font-size: 14px; opacity: 0.9; margin-top: 4px; color: #a7f3d0; }
  .body-content { padding: 32px 24px; color: #1e293b; }
  .badge { display: inline-block; padding: 6px 14px; font-size: 13px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-confirmed { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-rescheduled { background: #e0e7ff; color: #3730a3; }
  .badge-cancelled { background: #fee2e2; color: #991b1b; }
  .badge-alert { background: #fef2f2; color: #b91c1c; }
  .schedule-box { margin: 24px 0; background: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; }
  .schedule-label { font-size: 12px; text-transform: uppercase; font-weight: 700; color: #047857; letter-spacing: 1px; margin-bottom: 4px; }
  .schedule-number { font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #064e3b; font-family: monospace, monospace; }
  .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 12px; overflow: hidden; }
  .details-table td { padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .details-table tr:last-child td { border-bottom: none; }
  .label-cell { color: #64748b; font-weight: 600; width: 35%; }
  .value-cell { color: #0f172a; font-weight: 700; }
  .action-box { text-align: center; margin: 32px 0 16px; }
  .button { display: inline-block; background-color: #047857; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }
  .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
`

export function getConfirmationEmailHtml({
  scheduleId,
  patientName,
  clinicName,
  clinicAddress,
  clinicPhone,
  doctorName,
  doctorSpecialization,
  scheduledAt,
  notes,
  isPending = false,
}: EmailBaseProps & { isPending?: boolean }) {
  const formattedDate = format(new Date(scheduledAt), 'EEEE, MMMM d, yyyy')
  const formattedTime = format(new Date(scheduledAt), 'h:mm a')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">AppointCare</h1>
      <p class="tagline">Your trusted health appointment platform</p>
    </div>
    <div class="body-content">
      <div style="text-align: center; margin-bottom: 16px;">
        <span class="badge ${isPending ? 'badge-pending' : 'badge-confirmed'}">
          ${isPending ? 'Appointment Requested' : 'Appointment Confirmed'}
        </span>
      </div>

      <h2 style="font-size: 20px; color: #064e3b; margin-top: 0; text-align: center;">
        ${isPending ? 'Your Appointment Request Has Been Received' : 'Your Appointment is Confirmed!'}
      </h2>

      <p>Hello <strong>${patientName || 'Valued Patient'}</strong>,</p>
      <p>
        ${isPending
          ? `We have received your appointment request for <strong>${clinicName || 'the clinic'}</strong>. Your schedule number has been generated below for tracking.`
          : `Your visit with <strong>${clinicName || 'the clinic'}</strong> has been officially confirmed. Please present your schedule number when you arrive.`}
      </p>

      <div class="schedule-box">
        <div class="schedule-label">Schedule Reference Number</div>
        <div class="schedule-number">${scheduleId}</div>
        <p style="margin: 6px 0 0; font-size: 12px; color: #047857;">Please keep this ID for check-in and communication</p>
      </div>

      <table class="details-table">
        <tr>
          <td class="label-cell">Schedule ID</td>
          <td class="value-cell" style="font-family: monospace; color: #047857;">${scheduleId}</td>
        </tr>
        <tr>
          <td class="label-cell">Date</td>
          <td class="value-cell">${formattedDate}</td>
        </tr>
        <tr>
          <td class="label-cell">Time</td>
          <td class="value-cell">${formattedTime}</td>
        </tr>
        <tr>
          <td class="label-cell">Doctor</td>
          <td class="value-cell">Dr. ${doctorName || 'Assigned Specialist'}${doctorSpecialization ? ` (${doctorSpecialization})` : ''}</td>
        </tr>
        <tr>
          <td class="label-cell">Clinic</td>
          <td class="value-cell">${clinicName || 'Clinic'}</td>
        </tr>
        ${clinicAddress ? `
        <tr>
          <td class="label-cell">Address</td>
          <td class="value-cell">${clinicAddress}</td>
        </tr>` : ''}
        ${clinicPhone ? `
        <tr>
          <td class="label-cell">Contact Phone</td>
          <td class="value-cell">${clinicPhone}</td>
        </tr>` : ''}
        ${notes ? `
        <tr>
          <td class="label-cell">Notes / Reason</td>
          <td class="value-cell">${notes}</td>
        </tr>` : ''}
      </table>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 14px; font-size: 13px; color: #166534; line-height: 1.5;">
        <strong>Important Reminder:</strong> Please arrive 10-15 minutes prior to your scheduled time. If you need to reschedule or cancel, you can manage your visit from your AppointCare dashboard.
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AppointCare. Automated health appointment notification.</p>
      <p>Schedule ID: ${scheduleId}</p>
    </div>
  </div>
</body>
</html>
  `
}

export function getRescheduledEmailHtml({
  scheduleId,
  patientName,
  clinicName,
  clinicAddress,
  doctorName,
  doctorSpecialization,
  oldScheduledAt,
  scheduledAt,
  reason,
}: EmailBaseProps & { oldScheduledAt?: string | Date; reason?: string | null }) {
  const formattedDate = format(new Date(scheduledAt), 'EEEE, MMMM d, yyyy')
  const formattedTime = format(new Date(scheduledAt), 'h:mm a')
  const formattedOld = oldScheduledAt ? format(new Date(oldScheduledAt), 'PPp') : null

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%);">
      <h1 class="logo">AppointCare</h1>
      <p class="tagline" style="color: #c7d2fe;">Appointment Reschedule Notice</p>
    </div>
    <div class="body-content">
      <div style="text-align: center; margin-bottom: 16px;">
        <span class="badge badge-rescheduled">Rescheduled</span>
      </div>

      <h2 style="font-size: 20px; color: #1e1b4b; margin-top: 0; text-align: center;">
        Your Appointment Has Been Successfully Rescheduled
      </h2>

      <p>Hello <strong>${patientName || 'Valued Patient'}</strong>,</p>
      <p>Your appointment with <strong>${clinicName || 'the clinic'}</strong> has been updated with a new schedule time.</p>

      <div class="schedule-box" style="background: #eef2ff; border-color: #6366f1;">
        <div class="schedule-label" style="color: #4338ca;">Schedule Reference Number</div>
        <div class="schedule-number" style="color: #312e81;">${scheduleId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label-cell">Schedule ID</td>
          <td class="value-cell" style="font-family: monospace; color: #4338ca;">${scheduleId}</td>
        </tr>
        ${formattedOld ? `
        <tr>
          <td class="label-cell">Previous Schedule</td>
          <td class="value-cell" style="text-decoration: line-through; color: #94a3b8;">${formattedOld}</td>
        </tr>` : ''}
        <tr>
          <td class="label-cell">New Date & Time</td>
          <td class="value-cell" style="color: #047857;">${formattedDate} at ${formattedTime}</td>
        </tr>
        <tr>
          <td class="label-cell">Doctor</td>
          <td class="value-cell">Dr. ${doctorName || 'Assigned Specialist'}${doctorSpecialization ? ` (${doctorSpecialization})` : ''}</td>
        </tr>
        <tr>
          <td class="label-cell">Clinic</td>
          <td class="value-cell">${clinicName || 'Clinic'}</td>
        </tr>
        ${clinicAddress ? `
        <tr>
          <td class="label-cell">Address</td>
          <td class="value-cell">${clinicAddress}</td>
        </tr>` : ''}
        ${reason ? `
        <tr>
          <td class="label-cell">Reschedule Reason</td>
          <td class="value-cell">${reason}</td>
        </tr>` : ''}
      </table>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AppointCare. Automated health notification system.</p>
      <p>Schedule ID: ${scheduleId}</p>
    </div>
  </div>
</body>
</html>
  `
}

export function getDoctorUnavailableEmailHtml({
  scheduleId,
  patientName,
  clinicName,
  doctorName,
  scheduledAt,
  rescheduleUrl,
}: EmailBaseProps & { rescheduleUrl?: string }) {
  const formattedDate = format(new Date(scheduledAt), 'EEEE, MMMM d, yyyy')
  const formattedTime = format(new Date(scheduledAt), 'h:mm a')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);">
      <h1 class="logo">AppointCare</h1>
      <p class="tagline" style="color: #fecaca;">Notice: Doctor Schedule Update</p>
    </div>
    <div class="body-content">
      <div style="text-align: center; margin-bottom: 16px;">
        <span class="badge badge-alert">Doctor Unavailable</span>
      </div>

      <h2 style="font-size: 20px; color: #7f1d1d; margin-top: 0; text-align: center;">
        Your Doctor is Unavailable - Clinic is Rescheduling
      </h2>

      <p>Hello <strong>${patientName || 'Valued Patient'}</strong>,</p>
      <p>
        We regret to inform you that <strong>Dr. ${doctorName || 'your assigned doctor'}</strong> at <strong>${clinicName || 'the clinic'}</strong> is unavailable for your appointment scheduled on <strong>${formattedDate} at ${formattedTime}</strong>.
      </p>

      <div class="schedule-box" style="background: #fff1f2; border-color: #e11d48;">
        <div class="schedule-label" style="color: #be123c;">Schedule Reference Number</div>
        <div class="schedule-number" style="color: #9f1239;">${scheduleId}</div>
        <p style="margin: 6px 0 0; font-size: 13px; color: #be123c;">Your appointment has been queued for priority clinic rescheduling.</p>
      </div>

      <p>The clinic staff will assign an available doctor or reschedule your visit to another suitable time. You will receive an automated confirmation email and SMS as soon as your new time is confirmed.</p>

      <div class="action-box">
        <a href="${rescheduleUrl || '/patient/appointments'}" class="button" style="background-color: #047857;">
          View My Appointments
        </a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AppointCare. Automated notification.</p>
      <p>Schedule ID: ${scheduleId}</p>
    </div>
  </div>
</body>
</html>
  `
}

export function getReminderEmailHtml({
  scheduleId,
  patientName,
  clinicName,
  clinicAddress,
  doctorName,
  scheduledAt,
}: EmailBaseProps) {
  const formattedDate = format(new Date(scheduledAt), 'EEEE, MMMM d, yyyy')
  const formattedTime = format(new Date(scheduledAt), 'h:mm a')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">AppointCare</h1>
      <p class="tagline">Upcoming Appointment Reminder</p>
    </div>
    <div class="body-content">
      <div style="text-align: center; margin-bottom: 16px;">
        <span class="badge badge-confirmed">Reminder</span>
      </div>

      <h2 style="font-size: 20px; color: #064e3b; margin-top: 0; text-align: center;">
        Your Appointment is Coming Up Soon
      </h2>

      <p>Hello <strong>${patientName || 'Valued Patient'}</strong>,</p>
      <p>This is a quick reminder about your scheduled visit with <strong>${clinicName || 'the clinic'}</strong>.</p>

      <div class="schedule-box">
        <div class="schedule-label">Schedule Reference Number</div>
        <div class="schedule-number">${scheduleId}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label-cell">Schedule ID</td>
          <td class="value-cell" style="font-family: monospace; color: #047857;">${scheduleId}</td>
        </tr>
        <tr>
          <td class="label-cell">Date</td>
          <td class="value-cell">${formattedDate}</td>
        </tr>
        <tr>
          <td class="label-cell">Time</td>
          <td class="value-cell">${formattedTime}</td>
        </tr>
        <tr>
          <td class="label-cell">Doctor</td>
          <td class="value-cell">Dr. ${doctorName || 'Assigned Doctor'}</td>
        </tr>
        <tr>
          <td class="label-cell">Clinic</td>
          <td class="value-cell">${clinicName || 'Clinic'}</td>
        </tr>
        ${clinicAddress ? `
        <tr>
          <td class="label-cell">Address</td>
          <td class="value-cell">${clinicAddress}</td>
        </tr>` : ''}
      </table>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AppointCare.</p>
      <p>Schedule ID: ${scheduleId}</p>
    </div>
  </div>
</body>
</html>
  `
}
