'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Stethoscope, Clock, CheckCircle, Hash, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { formatScheduleId } from '@/lib/email-templates'

type Appointment = {
  id: string
  status: string
  scheduled_at: string
  clinic: { name: string; address: string } | null
  doctor: { name: string; specialization: string } | null
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 })
  const supabase = createClient()

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('appointments')
        .select('*, clinic:clinics(name, address), doctor:doctors(name, specialization)')
        .eq('patient_id', user.id)
        .order('scheduled_at', { ascending: false })

      const list = (data || []) as Appointment[]
      setAppointments(list)
      setStats({
        total: list.length,
        pending: list.filter((apt: Appointment) => apt.status === 'pending').length,
        confirmed: list.filter((apt: Appointment) => apt.status === 'confirmed').length,
      })
    }

    fetchAppointments()
  }, [supabase])

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-emerald-700">Your care overview</p>
        <h1 className="mt-1 text-3xl font-bold text-emerald-950">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep track of your appointments and care requests in one place.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Visits" value={stats.total} icon={Calendar} color="blue" />
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
            appointments.slice(0, 4).map((apt) => (
              <div key={apt.id} className="flex flex-col gap-3 rounded-md border border-emerald-100 bg-emerald-50/35 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-900">
                      <Hash className="size-3" />
                      {formatScheduleId(apt.id)}
                    </span>
                    <p className="font-semibold text-emerald-950">{apt.clinic?.name}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{format(new Date(apt.scheduled_at), 'PPp')}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <Stethoscope className="h-4 w-4 text-emerald-700" /> Dr. {apt.doctor?.name || 'To be assigned'}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-emerald-700" /> {apt.clinic?.address}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 capitalize">
                  {apt.status}
                </span>
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
        <div className={`rounded-lg p-3 ${palette[color as keyof typeof palette]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  )
}
