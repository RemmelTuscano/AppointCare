import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function updateOwnProfile(formData: FormData) {
  'use server'

  const supabase = await createClient()
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = String(formData.get('fullName') || '').trim()
  const location = String(formData.get('location') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const { error } = await supabase.from('profiles').update({ full_name: fullName || null, location: location || null, phone: phone || null, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return

  revalidatePath('/patient/account')
  revalidatePath('/patient/account/edit')
  redirect('/patient/account')
}

export default async function EditPatientProfilePage() {
  const supabase = await createClient()
  if (!supabase) redirect('/login')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, location').eq('id', user.id).single()

  return (
    <div className="mx-auto max-w-2xl space-y-7 pb-10">
      <Link href="/patient/account" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> Back to account</Link>
      <div><p className="text-sm font-medium text-emerald-700">Your profile</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">Edit profile</h1><p className="mt-2 text-sm text-gray-600">Keep your contact information current for appointment reminders and SMS updates.</p></div>
      <form action={updateOwnProfile} className="border border-emerald-100 bg-white p-6 shadow-sm"><div className="grid gap-5"><Field label="Full name" name="fullName" defaultValue={profile?.full_name || ''} required /><label className="space-y-2 text-sm font-medium text-emerald-950">Email<input value={profile?.email || user.email || ''} readOnly className="flex h-10 w-full rounded-md border border-emerald-100 bg-gray-50 px-3 py-2 font-normal text-gray-500" /></label><Field label="Phone number" name="phone" type="tel" defaultValue={profile?.phone || ''} required /><Field label="Location" name="location" defaultValue={profile?.location || ''} /></div><div className="mt-6 flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Save className="h-4 w-4" />Save profile</button></div></form>
    </div>
  )
}

function Field({ label, name, defaultValue, type = 'text', required = false }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean }) {
  return <label className="space-y-2 text-sm font-medium text-emerald-950">{label}{required ? ' *' : ''}<input name={name} type={type} defaultValue={defaultValue} required={required} className="flex h-10 w-full rounded-md border border-emerald-100 bg-white px-3 py-2 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
}