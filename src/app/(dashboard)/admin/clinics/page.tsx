import { Check, Clock3, MoreHorizontal, Search, Stethoscope } from 'lucide-react'

const clinics = [
  { name: 'Northstar Family Practice', location: 'Portland, OR', contact: 'hello@northstar.example', status: 'Pending review', submitted: 'Today' },
  { name: 'Harborview Pediatrics', location: 'Seattle, WA', contact: 'team@harborview.example', status: 'Documents received', submitted: 'Yesterday' },
  { name: 'Cedar Health Center', location: 'Austin, TX', contact: 'office@cedarhealth.example', status: 'Pending review', submitted: 'Yesterday' },
  { name: 'Willow &amp; Co. Wellness', location: 'Denver, CO', contact: 'care@willowco.example', status: 'Verified', submitted: 'Sep 18' },
]

export default function AdminClinicsPage() {
  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Directory control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Clinic management</h1><p className="mt-2 text-gray-600">Review submissions and keep the care directory trustworthy.</p></div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Stethoscope className="h-4 w-4" /> Add clinic</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="All clinics" value="42" tone="text-emerald-950" />
        <Summary label="Awaiting review" value="04" tone="text-amber-700" />
        <Summary label="Verified" value="38" tone="text-blue-700" />
      </div>

      <section className="border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 p-5 sm:flex-row sm:items-center">
          <div><h2 className="font-semibold text-emerald-950">Clinic directory</h2><p className="mt-1 text-sm text-gray-500">Search and review every clinic on AppointCare.</p></div>
          <label className="relative block sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input aria-label="Search clinics" placeholder="Search clinics" className="h-9 w-full rounded-md border border-emerald-100 bg-emerald-50/30 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-emerald-50/50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-semibold">Clinic</th><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Submitted</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-emerald-50">{clinics.map((clinic) => <tr key={clinic.name} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><p className="font-semibold text-emerald-950">{clinic.name}</p><p className="mt-1 text-gray-500">{clinic.location}</p></td><td className="px-5 py-4 text-gray-600">{clinic.contact}</td><td className="px-5 py-4 text-gray-600">{clinic.submitted}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${clinic.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : clinic.status === 'Documents received' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{clinic.status === 'Verified' ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{clinic.status}</span></td><td className="px-5 py-4 text-right"><button aria-label={`Actions for ${clinic.name}`} className="rounded-md p-2 text-gray-500 hover:bg-emerald-100 hover:text-emerald-800"><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-sm text-gray-500">{label}</p><p className={`mt-2 text-3xl font-bold ${tone}`}>{value}</p></div>
}