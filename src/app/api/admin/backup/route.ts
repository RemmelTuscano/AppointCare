import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordActivity } from '@/lib/activity'
import { ADMIN_BACKUP_CONTENT_TYPE, createAdminBackupWorkbook } from '@/lib/admin-backup'
import { runAutomatedAdminBackup } from '@/lib/admin-backup-automation'

export async function GET() {
  const sessionClient = await createClient()
  if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  if (user.app_metadata.role !== 'admin') return NextResponse.json({ error: 'Only administrators can create backups.' }, { status: 403 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })

  let backup: Awaited<ReturnType<typeof createAdminBackupWorkbook>>
  try {
    backup = await createAdminBackupWorkbook(admin)
  } catch (error) {
    console.error('Backup generation failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Unable to create backup.' }, { status: 500 })
  }

  await recordActivity({
    actorId: user.id,
    action: 'backup_created',
    entityType: 'system',
    summary: 'Administrator created a data backup',
    metadata: { tables: backup.tables, exportedAt: backup.exportedAt },
  })

  return new NextResponse(backup.buffer, {
    status: 200,
    headers: {
      'Content-Type': ADMIN_BACKUP_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="appointcare-backup-${backup.exportedAt.slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request) {
  return runAutomatedAdminBackup(request)
}
