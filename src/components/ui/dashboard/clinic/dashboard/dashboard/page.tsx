'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle, Clock, Hash, UserRound, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { formatScheduleId } from '@/lib/email-templates'

type ClinicAppointment = {
  id: string
  status: string
  scheduled_at: string
  notes: string | null
  patient: { full_name: string | null } | null
  doctor: { name: string | null } | null
}

export default function ClinicDashboard() {
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!clinic) return

      // Fetch via endpoint to ensure patient names are reliably resolved
      const res = await fetch(`/api/clinic/appointments?clinicId=${clinic.id}`)
      let list: ClinicAppointment[] = []
      if (res.ok) {
        const payload = await res.json()
        list = (payload.appointments || []) as ClinicAppointment[]
      } else {
        const { data } = await supabase
          .from('appointments')
          .select('id, status, scheduled_at, notes, patient:profiles(full_name), doctor:doctors(name)')
          .eq('clinic_id', clinic.id)
          .order('scheduled_at', { ascending: false })
        list = (data || []) as ClinicAppointment[]
      }

      setAppointments(list)
      setStats({
        total: list.length,
        pending: list.filter((appointment) => appointment.status === 'pending').length,
        confirmed: list.filter((appointment) => appointment.status === 'confirmed').length,
      })
    }

    fetchAppointments()
  }, [supabase])

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-emerald-700">Your care overview</p>
        <h1 className="mt-1 text-3xl font-bold text-emerald-950">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep track of patient appointments and care requests in one place.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total appointments" value={stats.total} icon={Calendar} color="blue" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={CheckCircle} color="green" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-emerald-950">Upcoming appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-gray-500">No appointments scheduled yet.</p>
          ) : (
            appointments.slice(0, 4).map((appointment) => (
              <div key={appointment.id} className="flex flex-col gap-3 rounded-md border border-emerald-100 bg-emerald-50/35 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-900">
                      <Hash className="size-3" />
                      {formatScheduleId(appointment.id)}
                    </span>
                    <p className="font-semibold text-emerald-950">{appointment.patient?.full_name || 'Patient'}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{format(new Date(appointment.scheduled_at), 'PPp')}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-600"><UserRound className="size-4" /> Dr. {appointment.doctor?.name || 'Unassigned'}</p>
                  {appointment.notes && <p className="mt-1 text-sm text-gray-600">{appointment.notes}</p>}
                </div>
                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium capitalize text-emerald-800">{appointment.status}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: LucideIcon; color: 'blue' | 'yellow' | 'green' }) {
  const palette = {
    blue: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    green: 'bg-teal-100 text-teal-700',
  }

  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${palette[color]}`}><Icon className="size-6" /></div>
      </CardContent>
    </Card>
  )
}
