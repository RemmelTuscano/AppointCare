import { Activity, Building2, CalendarDays, Clock3, ShieldCheck, UserRound } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

type ActivityRow = {
  id: string
  action: string
  entity_type: string
  summary: string
  created_at: string
  actor?: { full_name: string | null; email: string }[] | null
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ActivityIcon({ entityType }: { entityType: string }) {
  if (entityType === 'clinic') return <Building2 className="h-4 w-4" />
  if (entityType === 'appointment') return <CalendarDays className="h-4 w-4" />
  if (entityType === 'profile') return <UserRound className="h-4 w-4" />
  return <ShieldCheck className="h-4 w-4" />
}

export default async function AdminActivityPage() {
  const admin = createAdminClient()
  const { data: activityRows, error: activityError } = admin
    ? await admin.from('activity_logs').select('id, action, entity_type, summary, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(100)
    : { data: [], error: new Error('Admin database is not configured.') }
  const activities = (activityRows || []) as ActivityRow[]

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">System visibility</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Activity log</h1>
          <p className="mt-2 text-gray-600">Monitor important movement across clinics, users, and appointments.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><Activity className="h-4 w-4" /> Last 100 events</div>
      </div>

      {activityError && (
        <div className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Activity logging is not available yet. Run <code className="font-semibold">scripts/activity-log.sql</code> in Supabase SQL Editor to create the activity log table and triggers.
        </div>
      )}

      <section className="border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 px-5 py-4"><h2 className="font-semibold text-emerald-950">Recent activity</h2><p className="mt-1 text-sm text-gray-500">Newest events appear first.</p></div>
        {activities.length === 0 ? (
          <div className="px-5 py-16 text-center"><Clock3 className="mx-auto h-8 w-8 text-emerald-300" /><p className="mt-3 font-semibold text-emerald-950">No activity recorded yet</p><p className="mt-1 text-sm text-gray-500">Events will appear here as users and administrators make changes.</p></div>
        ) : (
          <div className="divide-y divide-emerald-50">{activities.map((event) => { const actor = event.actor?.[0]; return <div key={event.id} className="flex gap-4 px-5 py-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><ActivityIcon entityType={event.entity_type} /></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="font-semibold text-emerald-950">{event.summary}</p><time className="shrink-0 text-xs text-gray-500">{formatActivityDate(event.created_at)}</time></div><p className="mt-1 text-sm text-gray-500">{event.action.replaceAll('_', ' ')} · {actor?.full_name || actor?.email || 'System'}</p></div></div> })}</div>
        )}
      </section>
    </div>
  )
}