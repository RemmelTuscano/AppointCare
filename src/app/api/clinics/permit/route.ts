import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordActivity } from '@/lib/activity'
import { isClinicPermitPath } from '@/lib/supabase/permit-path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request) {
  const sessionClient = await createClient()
  if (!sessionClient) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })
  }

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const { data: profile } = await sessionClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'clinic') {
    return NextResponse.json({ error: 'Only clinic accounts can upload permits.' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Storage service is not configured.' }, { status: 500 })
  }

  const { data: clinic } = await admin
    .from('clinics')
    .select('id, permit_url')
    .eq('user_id', user.id)
    .single()

  if (!clinic) {
    return NextResponse.json({ error: 'No clinic profile found for this account.' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('permit')

  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Please upload a JPG, PNG, GIF, or PDF.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File is too large. Maximum size is 5 MB.' }, { status: 400 })
  }

  const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]
  const fileName = `${clinic.id}-${randomUUID()}.${extension}`
  const path = `${clinic.id}/${fileName}`

  const { error: uploadError } = await admin.storage
    .from('clinic_permits')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Permit upload failed:', uploadError.message)
    return NextResponse.json({ error: 'Failed to upload permit file.' }, { status: 500 })
  }

  const update = admin
    .from('clinics')
    .update({ permit_url: path })
    .eq('id', clinic.id)
    .eq('user_id', user.id)
  const { data: updatedClinic, error: clinicUpdateError } = await (clinic.permit_url === null
    ? update.is('permit_url', null)
    : update.eq('permit_url', clinic.permit_url))
    .select('id')
    .maybeSingle()

  if (clinicUpdateError || !updatedClinic) {
    if (clinicUpdateError) console.error('Clinic permit_url update failed:', clinicUpdateError.message)
    const { error: cleanupError } = await admin.storage.from('clinic_permits').remove([path])
    if (cleanupError) console.error('Permit upload cleanup failed:', cleanupError.message)
    return NextResponse.json(
      { error: clinicUpdateError ? 'Failed to link permit to clinic profile.' : 'The permit changed. Please try again.' },
      { status: clinicUpdateError ? 500 : 409 },
    )
  }

  if (clinic.permit_url && isClinicPermitPath(clinic.permit_url, clinic.id)) {
    const { error: cleanupError } = await admin.storage.from('clinic_permits').remove([clinic.permit_url])
    if (cleanupError) console.error('Previous permit cleanup failed:', cleanupError.message)
  }

  await recordActivity({
    actorId: user.id,
    action: 'permit_uploaded',
    entityType: 'clinic',
    entityId: clinic.id,
    summary: `${clinic.id} permit document was uploaded for verification`,
    metadata: { fileName, mimeType: file.type, fileSize: file.size },
  })

  return NextResponse.json({ path })
}

export async function DELETE() {
  const sessionClient = await createClient()
  if (!sessionClient) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })
  }

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Storage service is not configured.' }, { status: 500 })
  }

  const { data: clinic, error: clinicError } = await admin
    .from('clinics')
    .select('id, permit_url')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    return NextResponse.json({ error: 'No clinic profile found for this account.' }, { status: 404 })
  }

  if (!clinic.permit_url) {
    return NextResponse.json({ error: 'No permit on file to remove.' }, { status: 400 })
  }

  if (!isClinicPermitPath(clinic.permit_url, clinic.id)) {
    return NextResponse.json({ error: 'The permit path is invalid for this clinic.' }, { status: 409 })
  }

  const { error: removalError } = await admin.storage.from('clinic_permits').remove([clinic.permit_url])
  if (removalError) {
    console.error('Permit file removal failed:', removalError.message)
    return NextResponse.json({ error: 'Failed to remove permit file.' }, { status: 500 })
  }

  const { data: updatedClinic, error: updateError } = await admin
    .from('clinics')
    .update({ permit_url: null })
    .eq('id', clinic.id)
    .eq('user_id', user.id)
    .eq('permit_url', clinic.permit_url)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('Permit removal failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to remove permit from clinic profile.' }, { status: 500 })
  }

  if (!updatedClinic) {
    return NextResponse.json({ error: 'The permit changed. Please refresh and try again.' }, { status: 409 })
  }

  await recordActivity({
    actorId: user.id,
    action: 'permit_removed',
    entityType: 'clinic',
    entityId: clinic.id,
    summary: 'Clinic permit document was removed',
    metadata: {},
  })

  return NextResponse.json({ success: true })
}
