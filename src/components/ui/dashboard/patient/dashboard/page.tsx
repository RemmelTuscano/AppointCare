'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Stethoscope, Clock, CheckCircle, Hash, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { formatScheduleId } from '@/lib/schedule-id'

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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
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
    <div className="space-y-6 sm:space-y-7">
      <header>
        <p className="text-[10px] sm:text-xs font-bold uppercase text-primary">Your care overview</p>
        <h1 className="mt-1 font-heading text-2xl sm:text-3xl md:text-4xl font-medium text-foreground">Welcome back</h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Keep track of your appointments and care requests in one place.</p>
      </header>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <StatCard title="Total Visits" value={stats.total} icon={Calendar} color="blue" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={CheckCircle} color="green" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle className="font-heading text-base sm:text-lg text-foreground">Upcoming appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          {appointments.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500">No appointments scheduled yet.</p>
          ) : (
            appointments.slice(0, 4).map((apt) => (
              <div key={apt.id} className="flex flex-col gap-2 sm:gap-3 rounded-md border border-border/80 bg-muted/45 p-3 sm:p-4 transition-colors hover:border-primary/25 hover:bg-card md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="inline-flex items-center gap-0.5 rounded bg-secondary px-2 py-0.5 font-mono text-[10px] sm:text-xs font-bold text-secondary-foreground">
                      <Hash className="size-3" />
                      {formatScheduleId(apt.id)}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-950">{apt.clinic?.name}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{format(new Date(apt.scheduled_at), 'PPp')}</p>
                  <p className="mt-1 flex items-center gap-2 text-[10px] sm:text-xs text-gray-600">
                    <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" /> Dr. {apt.doctor?.name || 'To be assigned'}
                  </p>
                  <p className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-[#ba704d] flex-shrink-0" /> {apt.clinic?.address}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold capitalize ${apt.status === 'confirmed' ? 'bg-teal-100 text-teal-800' : apt.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>
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
    blue: 'bg-sky-100 text-sky-700',
    yellow: 'bg-amber-100 text-amber-700',
    green: 'bg-teal-100 text-teal-800',
  }

  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="flex items-center justify-between p-3 sm:p-4 md:p-6">
        <div>
          <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 sm:mt-2 font-heading text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={`rounded-lg p-2 sm:p-3 ${palette[color as keyof typeof palette]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </div>
      </CardContent>
    </Card>
  )
}
