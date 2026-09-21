export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Administrator portal</p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950">AppointCare overview</h1>
        <p className="mt-2 text-gray-600">Manage clinics, users, and platform operations from one place.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Clinic management</p>
          <p className="mt-2 font-semibold text-emerald-950">Review clinic activity and verification.</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">User management</p>
          <p className="mt-2 font-semibold text-emerald-950">Keep patient and clinic access organized.</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">System backup</p>
          <p className="mt-2 font-semibold text-emerald-950">Monitor platform data protection tasks.</p>
        </div>
      </div>
    </div>
  )
}