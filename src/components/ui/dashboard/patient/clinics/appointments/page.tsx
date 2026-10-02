'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Hash,
  MapPin,
  Search,
  Stethoscope,
  TriangleAlert,
} from 'lucide-react'
import { formatScheduleId } from '@/lib/email-templates'

type PatientAppointment = {
  id: string
  clinic_id: string
  doctor_id: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  scheduled_at: string
  created_at: string
  notes: string | null
  clinic: { id: string; name: string; address: string } | null
  doctor: { id: string; name: string; specialization: string | null; is_available: boolean } | null
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchAppointments = useEffectEvent(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('appointments')
        .select('*, clinic:clinics(id, name, address), doctor:doctors(id, name, specialization, is_available)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .order('scheduled_at', { ascending: false })

      setAppointments(data || [])
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchAppointments()
    }, 0)

    const channel = supabase
      .channel('patient-appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' }, 
        fetchAppointments
      )
      .subscribe()

    return () => {
      window.clearTimeout(initialLoad)
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const copyScheduleId = (scheduleId: string) => {
    navigator.clipboard.writeText(scheduleId)
    setCopiedId(scheduleId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredAppointments = appointments.filter((apt) => {
    const scheduleId = formatScheduleId(apt.id).toLowerCase()
    const clinicName = apt.clinic?.name?.toLowerCase() || ''
    const doctorName = apt.doctor?.name?.toLowerCase() || ''
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return scheduleId.includes(q) || clinicName.includes(q) || doctorName.includes(q)
  })

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading appointments...</div>

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Your care schedule</p>
          <h1 className="mt-1 text-3xl font-bold text-emerald-950">Current appointments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your schedule reference numbers, confirmed visits, and status updates managed by your clinic.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by SCH- ID or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      <div className="grid gap-4">
        {filteredAppointments.map((apt) => {
          const scheduleId = formatScheduleId(apt.id)
          const isDoctorUnavailable = apt.doctor && apt.doctor.is_available === false && apt.status !== 'cancelled' && apt.status !== 'completed'
          const isDetailsOpen = expandedAppointmentId === apt.id

          return (
            <Card
              key={apt.id}
              className={`overflow-hidden transition-all ${
                isDoctorUnavailable ? 'border-amber-300 bg-amber-50/20 shadow-sm' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-mono font-bold text-emerald-900">
                        <Hash className="size-3.5" />
                        <span>{scheduleId}</span>
                        <button
                          type="button"
                          onClick={() => copyScheduleId(scheduleId)}
                          className="ml-1 text-emerald-700 hover:text-emerald-950"
                          title="Copy Schedule ID"
                        >
                          {copiedId === scheduleId ? <Check className="size-3.5 text-emerald-700" /> : <Copy className="size-3.5" />}
                        </button>
                      </div>

                      <h3 className="truncate font-heading text-lg font-semibold text-emerald-950">
                        {apt.clinic?.name || 'Clinic'}
                      </h3>

                      <Badge
                        variant={
                          apt.status === 'confirmed'
                            ? 'default'
                            : apt.status === 'pending'
                            ? 'secondary'
                            : apt.status === 'cancelled'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {apt.status}
                      </Badge>

                      {isDoctorUnavailable && (
                        <Badge variant="destructive" className="flex items-center gap-1 bg-amber-600 text-white">
                          <TriangleAlert className="size-3" /> Doctor Unavailable
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium text-emerald-900">
                        <Stethoscope className="size-4 text-emerald-700" />
                        Dr. {apt.doctor?.name || 'To be assigned'}
                        {apt.doctor?.specialization ? ` (${apt.doctor.specialization})` : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-emerald-700" />
                        {format(new Date(apt.scheduled_at), 'PPp')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 text-emerald-700 shrink-0" />
                      <span>{apt.clinic?.address}</span>
                    </div>

                    {isDoctorUnavailable && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900">
                        <div className="flex items-start gap-2.5">
                          <TriangleAlert className="size-4.5 shrink-0 text-amber-700 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-950">
                              Dr. {apt.doctor?.name || 'Doctor'} is currently unavailable.
                            </p>
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Your clinic manages all schedule adjustments and will reassign an available doctor or reschedule your visit shortly. You will receive an automated Email &amp; SMS notification as soon as the updated schedule is confirmed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={isDetailsOpen}
                    aria-controls={`appointment-details-${apt.id}`}
                    className="w-full justify-between gap-2 sm:w-auto sm:justify-center"
                    onClick={() => setExpandedAppointmentId(isDetailsOpen ? null : apt.id)}
                  >
                    {isDetailsOpen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    {isDetailsOpen ? 'Hide details' : 'View details'}
                    {isDetailsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
                {isDetailsOpen && (
                  <section
                    id={`appointment-details-${apt.id}`}
                    aria-label={`Details for ${scheduleId}`}
                    className="mt-5 border-t border-border/70 pt-5"
                  >
                    <h4 className="font-heading text-lg font-semibold text-foreground">Appointment details</h4>
                    <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Schedule ID</dt>
                        <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{scheduleId}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Appointment time</dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">{format(new Date(apt.scheduled_at), 'PPpp')}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
                        <dd className="mt-1 text-sm font-medium capitalize text-foreground">{apt.status}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Clinic</dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">{apt.clinic?.name || 'Clinic'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Clinic address</dt>
                        <dd className="mt-1 text-sm text-foreground">{apt.clinic?.address || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Doctor</dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {apt.doctor?.name ? `Dr. ${apt.doctor.name}` : 'To be assigned'}
                          {apt.doctor?.specialization ? ` · ${apt.doctor.specialization}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Booked on</dt>
                        <dd className="mt-1 text-sm text-foreground">{format(new Date(apt.created_at), 'PP')}</dd>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs font-semibold uppercase text-muted-foreground">Notes</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{apt.notes || 'No notes provided.'}</dd>
                      </div>
                    </dl>
                  </section>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredAppointments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto mb-4 size-12 text-emerald-200" />
              <p>No appointments found</p>
              <p className="mt-1 text-sm">
                {searchQuery ? 'Try searching for a different Schedule ID or clinic.' : 'Browse clinics to request your first appointment.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}