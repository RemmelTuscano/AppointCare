import { CheckCircle2, DatabaseBackup, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import { AdminBackupActions, BackupDownloadButton } from '@/components/ui/admin-backup-actions'
import { ADMIN_BACKUP_BUCKET, isAdminBackupFilename } from '@/lib/admin-backup'
import { requireAdminClient } from '@/lib/supabase/admin-access'

export default async function AdminBackupPage() {
  const admin = await requireAdminClient()
  const { data: files, error: backupListError } = await admin.storage
    .from(ADMIN_BACKUP_BUCKET)
    .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

  if (backupListError) console.error('Could not load automated backup history:', backupListError.message)

  const backups = (files || []).filter((file) => (
    file.id && file.created_at && isAdminBackupFilename(file.name)
  ))

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Operations</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Backup center</h1><p className="mt-2 text-gray-600">Create a secure application data export for recovery or offline storage.</p></div>
        <AdminBackupActions />
      </div>
      <div className="grid gap-4 md:grid-cols-3"><div className="border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Backup type</p><p className="mt-3 text-2xl font-bold text-emerald-950">Excel workbook</p><p className="mt-2 text-xs text-emerald-700">Application data only</p></div><div className="border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">Included sheets</p><p className="mt-3 text-2xl font-bold text-emerald-950">5 sheets</p><p className="mt-2 text-xs text-gray-500">Profiles, clinics, doctors, appointments, notifications</p></div><div className="border border-emerald-100 bg-[#174c40] p-5 text-white shadow-sm"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#b8e2b9]" /><p className="font-semibold">Admin-only access</p></div><p className="mt-3 text-sm leading-6 text-emerald-100/75">Every export is checked against the signed-in administrator role.</p></div></div>
      <section className="border border-emerald-100 bg-white shadow-sm"><div className="border-b border-emerald-100 p-5"><h2 className="font-semibold text-emerald-950">On-demand backup</h2><p className="mt-1 text-sm text-gray-500">Create and download the latest Excel workbook.</p></div><div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><DatabaseBackup className="h-5 w-5" /></span><div><p className="font-semibold text-emerald-950">Current application data</p><p className="mt-1 text-sm text-gray-500">Includes no passwords or Supabase authentication secrets.</p></div></div><BackupDownloadButton /></div></section>
      <section className="border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 p-5">
          <h2 className="font-semibold text-emerald-950">Automated weekly backups</h2>
          <p className="mt-1 text-sm text-gray-500">Stored privately in Supabase; each weekly run removes backups older than 30 days.</p>
        </div>
        <div className="space-y-3 px-5 py-5">
          {backupListError ? (
            <p role="alert" className="text-sm text-red-700">Automated backup history is unavailable. Check the server logs and confirm the backup storage migration has been applied.</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-gray-500">No automated backups are available yet. Configure the weekly scheduler to start creating them.</p>
          ) : (
            backups.map((backup) => (
              <div key={backup.name} className="flex flex-col gap-2 border-b border-emerald-50 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-emerald-950">{format(new Date(backup.created_at!), 'PPpp')}</p>
                  <p className="text-xs text-gray-500">{backup.name}</p>
                </div>
                <a
                  href={`/api/admin/backup/download?name=${encodeURIComponent(backup.name)}`}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  Download
                </a>
              </div>
            ))
          )}
        </div>
      </section>
      <div className="flex gap-3 border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><HardDrive className="mt-0.5 h-5 w-5 shrink-0" /><p>Backups contain sensitive patient and clinic information. Keep downloaded copies in an approved secure location.</p></div>
    </div>
  )
}