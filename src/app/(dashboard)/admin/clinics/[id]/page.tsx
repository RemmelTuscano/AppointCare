import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Building2, CalendarDays, Check, Clock3, Mail, MapPin, Phone, UsersRound } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function AdminClinicDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  if (!admin) notFound()

  const { data: clinic } = await admin.from('clinics').select('id, user_id, name, address, phone, email, description, is_verified, created_at').eq('id', id).single()
  if (!clinic) notFound()

  const [{ data: owner }, { data: doctors }, { count: appointmentCount }] = await Promise.all([
    admin.from('profiles').select('full_name, email, phone, location, created_at').eq('id', clinic.user_id).single(),
    admin.from('doctors').select('id, name, specialization, is_available').eq('clinic_id', clinic.id).order('name'),
    admin.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinic.id),
  ])

  return (
    <div className="space-y-7 pb-10">
      <Link href="/admin/clinics" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> Back to clinic directory</Link>
      <div className="flex flex-col justify-between gap-5 border-b border-emerald-100 pb-7 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Clinic credibility review</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">{clinic.name}</h1><p className="mt-2 flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4" />{clinic.address}</p></div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${clinic.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{clinic.is_verified ? <BadgeCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{clinic.is_verified ? 'Verified clinic' : 'Pending review'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="border border-emerald-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-emerald-950"><Building2 className="h-5 w-5 text-emerald-700" />Registration details</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><Detail label="Clinic name" value={clinic.name} /><Detail label="Address" value={clinic.address} /><Detail label="Email" value={clinic.email || 'Not provided'} icon={<Mail className="h-4 w-4" />} /><Detail label="Phone" value={clinic.phone || 'Not provided'} icon={<Phone className="h-4 w-4" />} /><Detail label="Registered" value={formatDate(clinic.created_at)} icon={<CalendarDays className="h-4 w-4" />} /><Detail label="Daily capacity" value="Not configured" /></div><div className="mt-5 border-t border-emerald-50 pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Clinic description</p><p className="mt-2 leading-7 text-gray-700">{clinic.description || 'No description provided by the clinic.'}</p></div></section>
          <section className="border border-emerald-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-emerald-950"><UsersRound className="h-5 w-5 text-emerald-700" />Registered care team <span className="text-sm font-normal text-gray-500">({doctors?.length || 0})</span></h2>{doctors?.length ? <div className="mt-4 divide-y divide-emerald-50">{doctors.map((doctor) => <div key={doctor.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold text-emerald-950">{doctor.name}</p><p className="text-sm text-gray-500">{doctor.specialization || 'Specialization not provided'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{doctor.is_available ? 'Available' : 'Unavailable'}</span></div>)}</div> : <p className="mt-4 text-sm text-gray-500">No doctors have been registered yet.</p>}</section>
        </div>
        <aside className="space-y-6"><section className="border border-emerald-100 bg-[#174c40] p-5 text-white shadow-sm"><h2 className="font-semibold">Registration owner</h2><div className="mt-5 space-y-4 text-sm"><Detail label="Name" value={owner?.full_name || 'Not provided'} dark /><Detail label="Email" value={owner?.email || clinic.email || 'Not provided'} dark /><Detail label="Phone" value={owner?.phone || clinic.phone || 'Not provided'} dark /><Detail label="Location" value={owner?.location || 'Not provided'} dark /></div></section><section className="border border-emerald-100 bg-white p-5 shadow-sm"><h2 className="font-semibold text-emerald-950">Platform activity</h2><div className="mt-5 space-y-4"><div className="flex items-center justify-between border-b border-emerald-50 pb-3"><span className="flex items-center gap-2 text-sm text-gray-500"><CalendarDays className="h-4 w-4" />Appointments</span><strong className="text-emerald-950">{appointmentCount || 0}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-gray-500"><Check className="h-4 w-4" />Verification</span><strong className={clinic.is_verified ? 'text-emerald-700' : 'text-amber-700'}>{clinic.is_verified ? 'Approved' : 'Pending'}</strong></div></div></section></aside>
      </div>
    </div>
  )
}

function Detail({ label, value, icon, dark = false }: { label: string; value: string; icon?: React.ReactNode; dark?: boolean }) {
  return <div><p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-emerald-100/65' : 'text-gray-500'}`}>{label}</p><p className={`mt-1 flex items-center gap-2 ${dark ? 'text-white' : 'text-emerald-950'}`}>{icon}{value}</p></div>
}