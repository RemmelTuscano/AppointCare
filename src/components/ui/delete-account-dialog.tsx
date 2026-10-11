'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const deleteAccount = async () => {
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/patient/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Could not delete your account. Please try again.')
        setDeleting(false)
        return
      }
      window.location.href = '/'
    } catch {
      setMessage('Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setConfirmText(''); setMessage(null) } }}>
      <DialogTrigger>
        <Button variant="destructive">Delete account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This permanently deletes your profile, appointments, and notifications. This cannot be undone.
          </p>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={deleteAccount} disabled={confirmText !== 'DELETE' || deleting}>
              {deleting ? 'Deleting...' : 'Delete my account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
