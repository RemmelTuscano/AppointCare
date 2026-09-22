import Link from 'next/link'
import { ArrowLeft, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  if (!admin) notFound()
  const { data: profile } = await admin.from('profiles').select('id, full_name, email, role, phone, location').eq('id', id).single()
  if (!profile) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-7 pb-10">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> Back to users</Link>
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Access control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">View user profile</h1><p className="mt-2 text-gray-600">Review account and contact information for support.</p></div>
      <section className="border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-emerald-100 pb-5"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">{profile.role === 'admin' ? <ShieldCheck className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}</span><div><h2 className="font-semibold text-emerald-950">{profile.full_name || 'Unnamed user'}</h2><p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><Mail className="h-3.5 w-3.5" />{profile.email}</p></div><span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">{profile.role}</span></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Full name" value={profile.full_name || 'Not provided'} /><Field label="Phone number" value={profile.phone || 'Not provided'} /><Field label="Location" value={profile.location || 'Not provided'} /></div>
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="space-y-2 text-sm font-medium text-emerald-950"><span>{label}</span><p className="flex min-h-10 items-center rounded-md border border-emerald-100 bg-emerald-50/30 px-3 py-2 font-normal text-gray-700">{value}</p></div>
}