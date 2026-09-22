import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordActivity } from '@/lib/activity'

const tables = ['profiles', 'clinics', 'doctors', 'appointments', 'notifications'] as const

export async function GET() {
  const sessionClient = await createClient()
  if (!sessionClient) return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })

  const { data: profile } = await sessionClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Only administrators can create backups.' }, { status: 403 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AppointCare'
  workbook.created = new Date()

  for (const table of tables) {
    const { data, error } = await admin.from(table).select('*')
    if (error) {
      console.error(`Backup failed while reading ${table}:`, error.message)
      return NextResponse.json({ error: `Backup failed while reading ${table}.` }, { status: 500 })
    }
    const rows = (data || []) as Record<string, unknown>[]
    const worksheet = workbook.addWorksheet(table.charAt(0).toUpperCase() + table.slice(1))
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]

    if (keys.length > 0) {
      worksheet.columns = keys.map((key) => ({
        header: key,
        key,
        width: Math.min(Math.max(key.length + 2, 14), 32),
      }))
      worksheet.addRows(rows.map((row) => Object.fromEntries(keys.map((key) => [key, formatCell(row[key])]))) )
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174C40' } }
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]
      worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(keys.length).letter}1` }
    } else {
      worksheet.addRow(['No records'])
    }
  }

  const exportedAt = new Date().toISOString()
  await recordActivity({
    actorId: user.id,
    action: 'backup_created',
    entityType: 'system',
    summary: 'Administrator created a data backup',
    metadata: { tables, exportedAt },
  })

  const workbookBuffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(workbookBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="appointcare-backup-${exportedAt.slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}

function formatCell(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}
