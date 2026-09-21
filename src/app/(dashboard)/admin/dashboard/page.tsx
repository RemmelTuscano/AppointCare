import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, DatabaseBackup, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

type ClinicSummary = { id: string; name: string; address: string; is_verified: boolean; created_at: string }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()
  let clinics: ClinicSummary[] = []
  let userCount = 0

  if (admin) {
    const [clinicResult, userResult] = await Promise.all([
      admin.from('clinics').select('id, name, address, is_verified, created_at').order('created_at', { ascending: false }),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
    ])
    clinics = clinicResult.data || []
    userCount = userResult.count || 0
  }

  const pendingClinics = clinics.filter((clinic) => !clinic.is_verified)
  const verifiedClinics = clinics.length - pendingClinics.length
  const metrics = [
    { label: 'Clinics awaiting review', value: String(pendingClinics.length), detail: 'Live database count', icon: Stethoscope, tone: 'amber' },
    { label: 'Registered users', value: userCount.toLocaleString(), detail: 'Live database count', icon: UsersRound, tone: 'blue' },
    { label: 'Verified clinics', value: String(verifiedClinics), detail: 'Live database count', icon: ShieldCheck, tone: 'emerald' },
  ]
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Administrator portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Good morning, keep care moving.</h1>
          <p className="mt-2 max-w-2xl text-gray-600">A focused view of clinic verification, user access, and platform health.</p>
        </div>
        <Link href="/admin/clinics" className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900">
          Review clinics <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-950">{value}</p>
              </div>
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${tone === 'amber' ? 'bg-amber-100 text-amber-700' : tone === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-gray-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
            <div>
              <p className="text-lg font-semibold text-emerald-950">Clinic verification queue</p>
              <p className="mt-1 text-sm text-gray-500">Review submitted details before clinics go live.</p>
            </div>
            <Link href="/admin/clinics" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View all</Link>
          </div>
          <div className="divide-y divide-emerald-50">
            {pendingClinics.length === 0 ? <p className="px-5 py-10 text-center text-sm text-gray-500">No clinics are awaiting review.</p> : pendingClinics.slice(0, 3).map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-emerald-950">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.address} · Submitted {formatDate(item.created_at)}</p>
                </div>
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Needs review</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-emerald-100 bg-[#174c40] p-5 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><CheckCircle2 className="h-5 w-5 text-[#b8e2b9]" /></span>
            <div>
              <p className="font-semibold">Platform health</p>
              <p className="text-sm text-emerald-100/70">All systems operational</p>
            </div>
          </div>
          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-emerald-100/70">Notifications</span><span className="font-semibold text-[#b8e2b9]">Operational</span></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-emerald-100/70">SMS delivery</span><span className="font-semibold text-[#b8e2b9]">Operational</span></div>
            <div className="flex items-center justify-between"><span className="text-emerald-100/70">Last backup</span><span className="font-semibold">Today, 02:00 AM</span></div>
          </div>
          <Link href="/admin/backup" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#d8f2d4] hover:text-white">Open backup center <DatabaseBackup className="h-4 w-4" /></Link>
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><p className="text-lg font-semibold text-emerald-950">Quick actions</p><p className="mt-1 text-sm text-gray-500">Common administration tasks.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminAction href="/admin/clinics" icon={Stethoscope} title="Manage clinics" description="Review verification and clinic details." />
          <AdminAction href="/admin/users" icon={UsersRound} title="Manage users" description="Review access and contact information." />
          <AdminAction href="/admin/backup" icon={DatabaseBackup} title="Backup center" description="Check backup status and retention." />
        </div>
      </section>
    </div>
  )
}

function AdminAction({ href, icon: Icon, title, description }: { href: string; icon: typeof Stethoscope; title: string; description: string }) {
  return (
    <Link href={href} className="group border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-gray-400 transition group-hover:text-emerald-700" /></div>
      <p className="mt-5 font-semibold text-emerald-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
    </Link>
  )
}