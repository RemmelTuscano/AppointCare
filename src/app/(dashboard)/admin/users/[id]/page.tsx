import Link from 'next/link'
import { ArrowLeft, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function updateUserProfile(formData: FormData) {
  'use server'

  const userId = formData.get('userId')
  if (typeof userId !== 'string' || !userId) return

  const sessionClient = await createClient()
  if (!sessionClient) return
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return
  const { data: adminProfile } = await sessionClient.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return

  const admin = createAdminClient()
  if (!admin) return
  const fullName = String(formData.get('fullName') || '').trim()
  const location = String(formData.get('location') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const { error } = await admin.from('profiles').update({ full_name: fullName || null, location: location || null, phone: phone || null, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) return

  await admin.from('activity_logs').insert({ actor_id: user.id, action: 'profile_updated', entity_type: 'profile', entity_id: userId, summary: `Profile details updated for ${fullName || 'user'}`, metadata: { fields: ['full_name', 'location', 'phone'] } })
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  redirect('/admin/users')
}

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  if (!admin) notFound()
  const { data: profile } = await admin.from('profiles').select('id, full_name, email, role, phone, location').eq('id', id).single()
  if (!profile) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-7 pb-10">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> Back to users</Link>
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Access control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Edit user profile</h1><p className="mt-2 text-gray-600">Keep contact information accurate for notifications and account support.</p></div>
      <form action={updateUserProfile} className="border border-emerald-100 bg-white p-6 shadow-sm">
        <input type="hidden" name="userId" value={profile.id} />
        <div className="flex items-center gap-4 border-b border-emerald-100 pb-5"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">{profile.role === 'admin' ? <ShieldCheck className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}</span><div><h2 className="font-semibold text-emerald-950">{profile.full_name || 'Unnamed user'}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><Mail className="h-3.5 w-3.5" />{profile.email}</p></div><span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">{profile.role}</span></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Full name" name="fullName" defaultValue={profile.full_name || ''} required /><Field label="Phone number" name="phone" type="tel" defaultValue={profile.phone || ''} required /><Field label="Location" name="location" defaultValue={profile.location || ''} /></div>
        <div className="mt-6 flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Save className="h-4 w-4" />Save profile</button></div>
      </form>
    </div>
  )
}

function Field({ label, name, defaultValue, type = 'text', required = false }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean }) {
  return <label className="space-y-2 text-sm font-medium text-emerald-950">{label}{required ? ' *' : ''}<input name={name} type={type} defaultValue={defaultValue} required={required} className="flex h-10 w-full rounded-md border border-emerald-100 bg-white px-3 py-2 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
}