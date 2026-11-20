import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_BACKUP_BUCKET, isAdminBackupFilename } from '@/lib/admin-backup'

export async function GET(request: Request) {
  const sessionClient = await createClient()
  if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })

  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (user.app_metadata.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can download backups.' }, { status: 403 })
  }

  const filename = new URL(request.url).searchParams.get('name') || ''
  if (!isAdminBackupFilename(filename)) {
    return NextResponse.json({ error: 'Invalid backup filename.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })

  const { data, error: signedUrlError } = await admin.storage
    .from(ADMIN_BACKUP_BUCKET)
    .createSignedUrl(filename, 60, { download: filename })
  if (signedUrlError || !data?.signedUrl) {
    console.error('Could not create automated backup download link:', signedUrlError?.message || 'No signed URL returned.')
    return NextResponse.json({ error: 'Unable to download backup.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
