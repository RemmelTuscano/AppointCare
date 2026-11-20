import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ADMIN_BACKUP_BUCKET,
  ADMIN_BACKUP_CONTENT_TYPE,
  ADMIN_BACKUP_RETENTION_DAYS,
  createAdminBackupFilename,
  createAdminBackupWorkbook,
  isAdminBackupFilename,
} from '@/lib/admin-backup'

export async function runAutomatedAdminBackup(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.BACKUP_CRON_SECRET]
    .filter((secret): secret is string => !!secret && secret.length >= 32)
  if (secrets.length === 0) {
    console.error('CRON_SECRET or BACKUP_CRON_SECRET must be configured with at least 32 characters.')
    return NextResponse.json({ error: 'Automated backup is not configured.' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization') || ''
  const received = createHash('sha256').update(authorization).digest()
  const authorized = secrets.reduce((isAuthorized, secret) => {
    const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
    return timingSafeEqual(expected, received) || isAuthorized
  }, false)
  if (!authorized) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })

  let backup: Awaited<ReturnType<typeof createAdminBackupWorkbook>>
  try {
    backup = await createAdminBackupWorkbook(admin)
  } catch (error) {
    console.error('Automated backup generation failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Unable to create automated backup.' }, { status: 500 })
  }

  const filename = createAdminBackupFilename(new Date(backup.exportedAt))
  const bucket = admin.storage.from(ADMIN_BACKUP_BUCKET)
  const { error: uploadError } = await bucket.upload(filename, backup.buffer, {
    contentType: ADMIN_BACKUP_CONTENT_TYPE,
    cacheControl: '0',
    upsert: false,
  })

  if (uploadError) {
    console.error('Automated backup upload failed:', uploadError.message)
    return NextResponse.json({ error: 'Unable to store automated backup.' }, { status: 500 })
  }

  const { data: files, error: listError } = await bucket.list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'asc' },
  })
  if (listError) {
    console.error('Automated backup retention listing failed:', listError.message)
    return NextResponse.json({ success: true, filename, retentionCleanup: 'failed' }, {
      status: 207,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const cutoff = Date.now() - ADMIN_BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const expiredFiles = (files || [])
    .filter((file) => file.id && file.created_at && Date.parse(file.created_at) < cutoff && isAdminBackupFilename(file.name))
    .map((file) => file.name)

  if (expiredFiles.length > 0) {
    const { error: cleanupError } = await bucket.remove(expiredFiles)
    if (cleanupError) {
      console.error('Automated backup retention cleanup failed:', cleanupError.message)
      return NextResponse.json({ success: true, filename, retentionCleanup: 'failed' }, {
        status: 207,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
  }

  return NextResponse.json({
    success: true,
    filename,
    deletedBackups: expiredFiles.length,
    retentionDays: ADMIN_BACKUP_RETENTION_DAYS,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
