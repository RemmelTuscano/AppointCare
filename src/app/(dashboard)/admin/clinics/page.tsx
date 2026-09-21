import { Check, Clock3, MoreHorizontal, Search, Stethoscope } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function setClinicVerification(formData: FormData) {
  'use server'

  const clinicId = formData.get('clinicId')
  const verified = formData.get('verified') === 'true'
  if (typeof clinicId !== 'string' || !clinicId) return

  const sessionClient = await createClient()
  if (!sessionClient) return

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return

  const { data: profile } = await sessionClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return

  const admin = createAdminClient()
  if (!admin) return

  const { error } = await admin.from('clinics').update({ is_verified: verified }).eq('id', clinicId)
  if (error) {
    console.error('Clinic verification update failed:', error.message)
    return
  }

  revalidatePath('/admin/clinics')
  revalidatePath('/admin/dashboard')
  revalidatePath('/api/clinics')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default async function AdminClinicsPage() {
  const admin = createAdminClient()
  const { data: clinicRows } = admin
    ? await admin.from('clinics').select('id, name, address, email, is_verified, created_at').order('created_at', { ascending: false })
    : { data: [] }
  const clinics = clinicRows || []
  const verifiedCount = clinics.filter((clinic) => clinic.is_verified).length
  const pendingCount = clinics.length - verifiedCount

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Directory control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Clinic management</h1><p className="mt-2 text-gray-600">Review submissions and keep the care directory trustworthy.</p></div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Stethoscope className="h-4 w-4" /> Add clinic</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="All clinics" value={String(clinics.length)} tone="text-emerald-950" />
        <Summary label="Awaiting review" value={String(pendingCount)} tone="text-amber-700" />
        <Summary label="Verified" value={String(verifiedCount)} tone="text-blue-700" />
      </div>

      <section className="border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 p-5 sm:flex-row sm:items-center">
          <div><h2 className="font-semibold text-emerald-950">Clinic directory</h2><p className="mt-1 text-sm text-gray-500">Search and review every clinic on AppointCare.</p></div>
          <label className="relative block sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input aria-label="Search clinics" placeholder="Search clinics" className="h-9 w-full rounded-md border border-emerald-100 bg-emerald-50/30 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-emerald-50/50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-semibold">Clinic</th><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Submitted</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-emerald-50">{clinics.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500">No clinics found in the database.</td></tr> : clinics.map((clinic) => <tr key={clinic.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><p className="font-semibold text-emerald-950">{clinic.name}</p><p className="mt-1 text-gray-500">{clinic.address}</p></td><td className="px-5 py-4 text-gray-600">{clinic.email || 'No email'}</td><td className="px-5 py-4 text-gray-600">{formatDate(clinic.created_at)}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${clinic.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{clinic.is_verified ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{clinic.is_verified ? 'Verified' : 'Pending review'}</span></td><td className="px-5 py-4 text-right"><form action={setClinicVerification}><input type="hidden" name="clinicId" value={clinic.id} /><input type="hidden" name="verified" value={String(!clinic.is_verified)} /><button type="submit" className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${clinic.is_verified ? 'border border-amber-200 text-amber-800 hover:bg-amber-50' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}>{clinic.is_verified ? <MoreHorizontal className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{clinic.is_verified ? 'Revoke' : 'Verify clinic'}</button></form></td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p></div>
}