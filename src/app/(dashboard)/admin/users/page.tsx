import { Mail, Search, ShieldCheck, UserRound } from 'lucide-react'

const users = [
  { name: 'Maya Chen', email: 'maya.chen@example.com', role: 'Patient', phone: '+1 503 555 0184', state: 'Active' },
  { name: 'Northstar Family Practice', email: 'hello@northstar.example', role: 'Clinic', phone: '+1 503 555 0112', state: 'Review' },
  { name: 'Jordan Williams', email: 'jordan.williams@example.com', role: 'Patient', phone: '+1 206 555 0140', state: 'Active' },
  { name: 'Remmel Tuscano', email: 'admin@appointcare.example', role: 'Administrator', phone: '+1 415 555 0102', state: 'Active' },
]

export default function AdminUsersPage() {
  return (
    <div className="space-y-7 pb-10">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Access control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">User directory</h1><p className="mt-2 text-gray-600">Keep account roles, contact details, and access states easy to review.</p></div>
      <div className="flex flex-col justify-between gap-4 border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><h2 className="font-semibold text-emerald-950">All accounts</h2><p className="mt-1 text-sm text-gray-500">1,284 registered users across all roles.</p></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input aria-label="Search users" placeholder="Search users" className="h-9 w-full rounded-md border border-emerald-100 bg-emerald-50/30 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label></div>
      <section className="border border-emerald-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-emerald-50/50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-semibold">User</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Phone</th><th className="px-5 py-3 font-semibold">State</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-emerald-50">{users.map((user) => <tr key={user.email} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">{user.role === 'Administrator' ? <ShieldCheck className="h-4 w-4" /> : user.role === 'Clinic' ? <UserRound className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</span><div><p className="font-semibold text-emerald-950">{user.name}</p><p className="mt-1 flex items-center gap-1 text-gray-500"><Mail className="h-3 w-3" />{user.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{user.role}</span></td><td className="px-5 py-4 text-gray-600">{user.phone}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.state === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{user.state}</span></td><td className="px-5 py-4 text-right"><button className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View</button></td></tr>)}</tbody></table></div></section>
    </div>
  )
}