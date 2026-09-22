'use client'

import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'

export function AdminBackupActions() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const downloadBackup = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/backup')
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Unable to create backup.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `appointcare-backup-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Backup created and downloaded successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create backup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={downloadBackup}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Creating backup...' : 'Run backup'}
      </button>
      {message && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{message}</p>}
    </>
  )
}

export function BackupDownloadButton() {
  const [loading, setLoading] = useState(false)

  const downloadBackup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup')
      if (!response.ok) throw new Error('Unable to download backup.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `appointcare-backup-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={downloadBackup} disabled={loading} aria-label="Download current backup" className="rounded-md border border-emerald-100 p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
      <Download className="h-4 w-4" />
    </button>
  )
}
