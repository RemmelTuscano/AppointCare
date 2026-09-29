'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'
import { BadgeCheck, Building2, ExternalLink, FileText, KeyRound, Pencil, Trash2, Upload } from 'lucide-react'

type ClinicProfile = {
  id: string
  name: string
  address: string
  phone: string | null
  email: string | null
  description: string | null
  is_verified: boolean
  daily_capacity: number
  permit_url: string | null
}

const emptyForm = { name: '', address: '', phone: '', email: '', description: '', dailyCapacity: '10' }

export default function ClinicAccountPage() {
  const [clinic, setClinic] = useState<ClinicProfile | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [permitUploading, setPermitUploading] = useState(false)
  const [permitMessage, setPermitMessage] = useState<string | null>(null)
  const supabase = createClient()

  const loadClinic = useEffectEvent(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setMessage('Your session has expired. Please sign in again.')
        return
      }

      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, phone, email, description, is_verified, daily_capacity, permit_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error || !data) {
        setMessage(error ? 'We could not load your clinic profile. Please try again.' : 'No clinic profile is linked to this account yet.')
        return
      }

      setClinic(data)
      setForm({ name: data.name, address: data.address, phone: data.phone || '', email: data.email || '', description: data.description || '', dailyCapacity: String(data.daily_capacity) })
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadClinic() }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [supabase])

  const saveClinic = async () => {
    const dailyCapacity = Number(form.dailyCapacity)
    if (!clinic || !form.name.trim() || !form.address.trim() || !form.phone.trim() || !Number.isInteger(dailyCapacity) || dailyCapacity < 1) return
    setSaving(true)
      const { data, error } = await supabase
      .from('clinics')
      .update({ name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, description: form.description.trim() || null, daily_capacity: dailyCapacity })
      .eq('id', clinic.id)
      .select('id, name, address, phone, email, description, is_verified, daily_capacity, permit_url')
      .single()

    if (error || !data) {
      setMessage('We could not save your clinic details. Please try again.')
    } else {
      setClinic(data)
      setEditing(false)
      setMessage('Clinic details saved.')
    }
    setSaving(false)
  }

  const uploadPermit = async (file: File) => {
    setPermitUploading(true)
    setPermitMessage(null)

    const formData = new FormData()
    formData.append('permit', file)

    try {
      const response = await fetch('/api/clinics/permit', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload permit.')
      }

      setClinic((current) => (current ? { ...current, permit_url: data.path } : null))
      setPermitMessage(data.permitUrl
        ? `Permit uploaded successfully. Your clinic is now under review.`
        : `Permit uploaded successfully.`)
    } catch (error) {
      setPermitMessage(error instanceof Error ? error.message : 'Failed to upload permit.')
    } finally {
      setPermitUploading(false)
    }
  }

  const removePermit = async () => {
    setPermitUploading(true)
    setPermitMessage(null)

    try {
      const response = await fetch('/api/clinics/permit', { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove permit.')
      }

      setClinic((current) => (current ? { ...current, permit_url: null } : null))
      setPermitMessage('Permit removed successfully.')
    } catch (error) {
      setPermitMessage(error instanceof Error ? error.message : 'Failed to remove permit.')
    } finally {
      setPermitUploading(false)
    }
  }

  const getPermitPublicUrl = (path: string | null) => {
    if (!path) return null
    const { data } = supabase.storage.from('clinic_permits').getPublicUrl(path)
    return data.publicUrl
  }

  const permitPublicUrl = getPermitPublicUrl(clinic?.permit_url)

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading clinic profile...</div>

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-emerald-700">Clinic profile</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">Account & settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage the clinic information patients see when choosing where to book.</p>
      </div>

      {message && <div className={`rounded-md border px-4 py-3 text-sm ${message === 'Clinic details saved.' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{message}</div>}

      <div className="grid gap-6 max-w-2xl">
        {/* Clinic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><Building2 className="size-5 text-emerald-700" />Clinic information</CardTitle>
            <CardDescription>Details displayed in the patient clinic directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clinic ? <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clinic name</p>
                <p className="text-lg text-emerald-950">{clinic.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="break-all text-lg text-emerald-950">{clinic.email || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg text-emerald-950">{clinic.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-lg text-emerald-950">{clinic.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily patient capacity</p>
                <p className="text-lg text-emerald-950">{clinic.daily_capacity} appointments</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-foreground">{clinic.description || 'No description provided'}</p>
            </div>
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogTrigger><Button className="mt-2"><Pencil className="mr-2 size-4" />Edit clinic details</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit clinic details</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <FormField label="Clinic name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                  <FormField label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
                  <FormField label="Phone number" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} required type="tel" />
                  <FormField label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                  <FormField label="Daily patient capacity" type="number" min="1" value={form.dailyCapacity} onChange={(value) => setForm((current) => ({ ...current, dailyCapacity: value }))} />
                  <div className="space-y-2"><Label htmlFor="clinic-description">Description</Label><textarea id="clinic-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-24 w-full resize-none rounded-md border border-input p-3 text-sm outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100" /></div>
                  <Button className="w-full" disabled={saving || !form.name.trim() || !form.address.trim() || !form.phone.trim() || !Number.isInteger(Number(form.dailyCapacity)) || Number(form.dailyCapacity) < 1} onClick={saveClinic}>{saving ? 'Saving changes...' : 'Save clinic details'}</Button>
                </div>
              </DialogContent>
            </Dialog>
            </> : <p className="text-muted-foreground">No clinic profile is available.</p>}
          </CardContent>
        </Card>

        {/* Verification Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><BadgeCheck className="size-5 text-emerald-700" />Verification status</CardTitle>
            <CardDescription>Clinic verification information</CardDescription>
          </CardHeader>
           <CardContent className="space-y-4">
             <div>
               <p className="mb-2 text-sm font-medium text-muted-foreground">Current status</p>
               <p className={`text-lg font-medium ${clinic?.is_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                 {clinic?.is_verified ? 'Verified' : 'Pending verification'}
               </p>
               {!clinic?.is_verified && (
                 <p className="mt-2 text-sm text-muted-foreground">
                   Your clinic is awaiting verification from the administrator.
                 </p>
               )}
             </div>

             <div>
               <p className="mb-2 text-sm font-medium text-muted-foreground">Verification permit</p>
               <p className="text-sm text-muted-foreground">
                 Upload a photo or scan of your clinic permit, license, or registration document.
                 Accepted formats: JPG, PNG, GIF, PDF (max 5 MB).
               </p>

               {permitPublicUrl ? (
                 <div className="mt-3 space-y-3">
                   {clinic?.permit_url?.endsWith('.pdf') ? (
                     <a
                       href={permitPublicUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900"
                     >
                       <FileText className="h-4 w-4" />
                       View permit document
                       <ExternalLink className="h-3 w-3" />
                     </a>
                    ) : (
                      <a
                        href={permitPublicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={permitPublicUrl}
                          alt="Clinic permit"
                          className="max-h-48 w-full max-w-xs rounded-md border border-emerald-100 object-contain"
                        />
                     </a>
                   )}

                   <Button
                     variant="outline"
                     size="sm"
                     disabled={permitUploading}
                     onClick={removePermit}
                   >
                     <Trash2 className="mr-2 h-4 w-4" />
                     {permitUploading ? 'Removing...' : 'Remove permit'}
                   </Button>
                 </div>
               ) : (
                 <div className="mt-3">
                   <label className="flex h-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-emerald-200 bg-emerald-50/30 px-4 text-sm text-emerald-700 transition hover:bg-emerald-100">
                     <input
                       type="file"
                       accept="image/jpeg,image/png,image/gif,application/pdf"
                       className="sr-only"
                       disabled={permitUploading}
                       onChange={(e) => {
                         const file = e.target.files?.[0]
                         if (file) void uploadPermit(file)
                         e.target.value = ''
                       }}
                     />
                     <Upload className="mr-2 h-4 w-4" />
                     {permitUploading ? 'Uploading...' : 'Choose a file to upload'}
                   </label>
                 </div>
               )}

               {permitMessage && (
                 <p className="mt-2 text-sm text-emerald-700">{permitMessage}</p>
               )}
             </div>
           </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><KeyRound className="size-5 text-emerald-700" />Security</CardTitle>
            <CardDescription>Manage your password and authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Password</p>
              <ChangePasswordDialog />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text', min, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean }) {
  const id = `clinic-${label.toLowerCase().replaceAll(' ', '-')}`
  return <div className="space-y-2"><Label htmlFor={id}>{label}{required ? ' *' : ''}</Label><Input id={id} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>
}
