'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ChangePasswordDialog({ triggerLabel = 'Change password' }: { triggerLabel?: string }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '', nonce: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [nonceSent, setNonceSent] = useState(false)
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      const changedAt = data.user?.user_metadata?.password_changed_at
      if (typeof changedAt === 'string') setLastChangedAt(changedAt)
    })
  }, [supabase])

  const reset = () => {
    setForm({ newPassword: '', confirmPassword: '', nonce: '' })
    setNonceSent(false)
  }

  const sendReauthenticationCode = async () => {
    if (!supabase) return
    setSaving(true)
    const { error } = await supabase.auth.reauthenticate()
    if (error) {
      setMessage(error.message || 'We could not send a verification code. Please try again.')
    } else {
      setNonceSent(true)
      setMessage('Enter the verification code we emailed you to confirm the change.')
    }
    setSaving(false)
  }

  const changePassword = async () => {
    if (!supabase) return
    if (form.newPassword.length < 8 || form.newPassword !== form.confirmPassword) return
    if (!nonceSent) return sendReauthenticationCode()
    if (!form.nonce.trim()) return
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.auth.updateUser({
      password: form.newPassword,
      nonce: form.nonce.trim(),
      data: { password_changed_at: now },
    })
    if (error) {
      setMessage(error.message || 'We could not update your password. Please try again.')
    } else {
      setMessage('Password updated.')
      setLastChangedAt(now)
      reset()
      setOpen(false)
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Last changed: {lastChangedAt ? format(new Date(lastChangedAt), 'PPP p') : 'Never'}</p>
      {message && <p className={`mb-4 text-sm ${message === 'Password updated.' ? 'text-emerald-700' : 'text-amber-700'}`}>{message}</p>}
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setMessage(null); else reset() }}>
        <DialogTrigger><Button variant="outline">{triggerLabel}</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="account-new-password">New password *</Label>
              <Input id="account-new-password" type="password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-new-password">Confirm new password *</Label>
              <Input id="account-confirm-new-password" type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
            </div>
            {form.newPassword.length > 0 && form.newPassword.length < 8 && <p className="text-sm text-amber-700">Password must be at least 8 characters.</p>}
            {form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword && <p className="text-sm text-amber-700">Passwords do not match.</p>}
            {nonceSent && (
              <div className="space-y-2">
                <Label htmlFor="account-nonce">Verification code *</Label>
                <Input id="account-nonce" value={form.nonce} onChange={(event) => setForm((current) => ({ ...current, nonce: event.target.value }))} required />
              </div>
            )}
            <Button
              className="w-full"
              disabled={saving || form.newPassword.length < 8 || form.newPassword !== form.confirmPassword || (nonceSent && !form.nonce.trim())}
              onClick={changePassword}
            >
              {saving ? 'Please wait...' : nonceSent ? 'Update password' : 'Send verification code'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
