'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/send-email'

type VerificationResult = { status: 'success' | 'warning' | 'error'; message: string }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

export async function setClinicVerification(clinicId: string, verified: boolean): Promise<VerificationResult> {
  if (typeof clinicId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId) || typeof verified !== 'boolean') {
    return { status: 'error', message: 'Invalid clinic or verification status.' }
  }

  const sessionClient = await createClient()
  if (!sessionClient) return { status: 'error', message: 'Authentication is not configured.' }
  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user || user.app_metadata.role !== 'admin') {
    return { status: 'error', message: 'Only administrators can change clinic verification.' }
  }

  const admin = createAdminClient()
  if (!admin) return { status: 'error', message: 'Database service is not configured.' }
  const update = admin.from('clinics').update({ is_verified: verified }).eq('id', clinicId)
  const { data: clinic, error } = await (verified
    ? update.or('is_verified.eq.false,is_verified.is.null')
    : update.eq('is_verified', true))
    .select('id, name, user_id').maybeSingle()

  if (error) {
    console.error('Clinic verification update failed:', error.message)
    return { status: 'error', message: 'Unable to update clinic verification. Please try again.' }
  }
  if (!clinic) {
    return { status: 'error', message: 'The clinic was not found or its status has changed. Refresh and try again.' }
  }

  try {
    const { error: logError } = await admin.from('activity_logs').insert({
      actor_id: user.id,
      action: verified ? 'clinic_verified' : 'clinic_verification_revoked',
      entity_type: 'clinic',
      entity_id: clinic.id,
      summary: `${clinic.name || 'Clinic'} was ${verified ? 'verified' : 'marked for review'}`,
      metadata: { verified },
    })
    if (logError) console.error('Clinic verification activity logging failed:', logError.message)
  } catch (error) {
    console.error('Clinic verification activity logging failed:', error)
  }

  revalidatePath('/admin/clinics')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/activity')
  revalidatePath('/clinic/account')
  revalidatePath('/api/clinics')

  if (!verified) return { status: 'success', message: 'Clinic verification was revoked.' }

  let recipient: string | undefined
  try {
    const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(clinic.user_id)
    if (ownerError) console.error('Unable to find clinic owner email:', ownerError.message)
    else recipient = owner.user?.email
  } catch (error) {
    console.error('Unable to find clinic owner email:', error)
  }
  if (!recipient) {
    console.error('Clinic owner email is unavailable.')
    return { status: 'warning', message: 'The clinic was verified, but its account email could not be found. Please notify the clinic manually.' }
  }

  const email = await sendEmail({
    to: recipient,
    subject: 'Your clinic is verified - AppointCare',
    html: `<p>Hello ${escapeHtml(clinic.name || 'Clinic')},</p><p>Your clinic account has been verified on AppointCare.</p><p>Thank you,<br>AppointCare</p>`,
  })
  if (!email.sent) {
    console.error('Clinic verification email failed:', email.error)
    return { status: 'warning', message: `The clinic was verified, but the email could not be sent: ${email.error || 'Unknown email error'}. Please notify the clinic manually.` }
  }
  return { status: 'success', message: 'Clinic verified. The verification email was accepted by the email provider; delivery is not confirmed.' }
}
