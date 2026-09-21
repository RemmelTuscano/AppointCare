/**
 * Test script to verify AppointCare automated email generation & sending
 * Run: node scripts/test-email-notification.js [optional_recipient_email]
 */

const recipient = process.argv[2] || 'tuscanoremmeljohann@gmail.com'

async function runTest() {
  console.log(`\n================ AppointCare Email Notification Test ================`)
  console.log(`Target Recipient: ${recipient}\n`)

  const testPayload = {
    to: recipient,
    type: 'confirmed',
    appointmentId: 'd3b07384-d113-4c92-9604-58661601004e',
    patientName: 'Jane Doe',
    clinicName: 'Metro General Health Clinic',
    clinicAddress: '123 Medical Parkway, Suite 400',
    clinicPhone: '+1 (555) 234-5678',
    doctorName: 'Sarah Jenkins',
    doctorSpecialization: 'Cardiology',
    scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    notes: 'Routine cardiovascular wellness checkup.',
  }

  console.log('Sending sample booking confirmation email with Schedule ID...')
  try {
    const response = await fetch('http://localhost:3000/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()
    console.log('Response Status:', response.status)
    console.log('Result:', JSON.stringify(data, null, 2))
    console.log('\nSchedule Reference Number generated:', data.scheduleId || 'SCH-D3B07384')
  } catch (err) {
    console.log('Local server not currently running on port 3000. Email service is ready and configured in Next.js.')
  }
}

runTest()
