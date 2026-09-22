import { Mail, Search, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminUsersPage() {
  const admin = createAdminClient()
  const { data: userRows } = admin
    ? await admin.from('profiles').select('id, full_name, email, role, phone, created_at').order('created_at', { ascending: false })
    : { data: [] }
  const users = userRows || []

  return (
    <div className="space-y-7 pb-10">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Access control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">User directory</h1><p className="mt-2 text-gray-600">Keep account roles, contact details, and access states easy to review.</p></div>
      <div className="flex flex-col justify-between gap-4 border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><h2 className="font-semibold text-emerald-950">All accounts</h2><p className="mt-1 text-sm text-gray-500">{users.length} registered users across all roles.</p></div><label className="relative block sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input aria-label="Search users" placeholder="Search users" className="h-9 w-full rounded-md border border-emerald-100 bg-emerald-50/30 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label></div>
      <section className="border border-emerald-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-emerald-50/50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-semibold">User</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Phone</th><th className="px-5 py-3 font-semibold">State</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-emerald-50">{users.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500">No users found in the database.</td></tr> : users.map((user) => <tr key={user.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">{user.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</span><div><p className="font-semibold text-emerald-950">{user.full_name || 'Unnamed user'}</p><p className="mt-1 flex items-center gap-1 text-gray-500"><Mail className="h-3 w-3" />{user.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">{user.role}</span></td><td className="px-5 py-4 text-gray-600">{user.phone || 'Missing phone'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.phone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{user.phone ? 'Active' : 'Needs phone'}</span></td><td className="px-5 py-4 text-right"><Link href={`/admin/users/${user.id}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View profile</Link></td></tr>)}</tbody></table></div></section>
    </div>
  )
}