import 'server-only'

import ExcelJS from 'exceljs'
import { createAdminClient } from '@/lib/supabase/admin'

export const ADMIN_BACKUP_BUCKET = 'admin_backups'
export const ADMIN_BACKUP_RETENTION_DAYS = 30
export const ADMIN_BACKUP_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const ADMIN_BACKUP_TABLES = ['profiles', 'clinics', 'doctors', 'appointments', 'notifications'] as const

const PAGE_SIZE = 1000
const backupFilenamePattern = /^appointcare-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.xlsx$/

type AdminBackupClient = NonNullable<ReturnType<typeof createAdminClient>>

export function createAdminBackupFilename(date = new Date()) {
  return `appointcare-backup-${date.toISOString().replace(/[:.]/g, '-')}.xlsx`
}

export function isAdminBackupFilename(filename: string) {
  return backupFilenamePattern.test(filename)
}

export async function createAdminBackupWorkbook(admin: AdminBackupClient) {
  const exportedAt = new Date().toISOString()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AppointCare'
  workbook.created = new Date(exportedAt)

  for (const table of ADMIN_BACKUP_TABLES) {
    const rows: Record<string, unknown>[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await admin
        .from(table)
        .select('*')
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw new Error(`Backup failed while reading ${table}: ${error.message}`)
      rows.push(...((data || []) as Record<string, unknown>[]))
      if (!data || data.length < PAGE_SIZE) break
    }

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

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    exportedAt,
    tables: ADMIN_BACKUP_TABLES,
  }
}

function formatCell(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}
