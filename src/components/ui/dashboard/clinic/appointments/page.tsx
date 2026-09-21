'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import {
  CalendarDays,
  CalendarSync,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Hash,
  Info,
  Mail,
  MessageSquare,
  Search,
  Stethoscope,
  TriangleAlert,
  UserRound,
  XCircle,
} from 'lucide-react'
import { formatScheduleId } from '@/lib/email-templates'

type ClinicAppointment = {
  id: string
  patient_id: string
  clinic_id: string
  doctor_id: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  scheduled_at: string
  notes: string | null
  patient: { id: string; full_name: string | null; email: string | null; phone: string | null } | null
  doctor: { id: string; name: string | null; specialization: string | null; is_available: boolean } | null
  clinic: { id: string; name: string; address: string } | null
}

type AvailableDoctor = {
  id: string
  name: string
  specialization: string | null
  is_available: boolean
}

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:30 PM',
  '02:30 PM',
  '03:30 PM',
  '04:30 PM',
]

function sortAppointments(appointments: ClinicAppointment[]) {
  return [...appointments].sort((first, second) => {
    if (first.status === 'pending' && second.status !== 'pending') return -1
    if (first.status !== 'pending' && second.status === 'pending') return 1
    return new Date(second.scheduled_at).getTime() - new Date(first.scheduled_at).getTime()
  })
}

export default function ClinicAppointments() {
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([])
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicDoctors, setClinicDoctors] = useState<AvailableDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Reschedule dialog state
  const [reschedulingApt, setReschedulingApt] = useState<ClinicAppointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>()
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00 AM')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [rescheduleReason, setRescheduleReason] = useState<string>('')
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false)

  const supabase = createClient()

  const fetchAppointments = useEffectEvent(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clinic } = await supabase
        .from('clinics')
        .select('id, name, address')
        .eq('user_id', user.id)
        .single()

      if (!clinic) return
      setClinicId(clinic.id)

      // Fetch appointments via dedicated endpoint using server-side elevated access
      // to ensure patient names and profiles are always resolved properly
      const res = await fetch(`/api/clinic/appointments?clinicId=${clinic.id}`)
      if (res.ok) {
        const payload = await res.json()
        setAppointments(sortAppointments(payload.appointments || []))
      } else {
        // Fallback to client supabase query if API is unreachable
        const { data } = await supabase
          .from('appointments')
          .select('*, patient:profiles(id, full_name, email, phone), doctor:doctors(id, name, specialization, is_available), clinic:clinics(id, name, address)')
          .eq('clinic_id', clinic.id)
          .order('scheduled_at', { ascending: false })

        setAppointments(sortAppointments(data || []))
      }

      // Also fetch clinic doctors for reassignments
      const { data: docs } = await supabase
        .from('doctors')
        .select('id, name, specialization, is_available')
        .eq('clinic_id', clinic.id)
      setClinicDoctors(docs || [])
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchAppointments()
    }, 0)
    
    const channel = supabase
      .channel('appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments()
      })
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

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setUpdatingId(id)
    const aptToUpdate = appointments.find((a) => a.id === id)
    const scheduleId = formatScheduleId(id)

    const { data: apt, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select('*, patient:profiles(id, email, full_name, phone), doctor:doctors(name, specialization), clinic:clinics(name, address)')
      .single()

    if (apt && !error) {
      setAppointments((current) => sortAppointments(current.map((appointment) => (
        appointment.id === id ? { ...appointment, status } : appointment
      ))))

      // Trigger automated multi-channel notifications (Email + SMS + In-app)
      await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: status === 'confirmed' ? 'confirmed' : 'cancelled',
          appointmentId: id,
          patientEmail: apt.patient?.email,
          patientPhone: apt.patient?.phone,
          patientName: apt.patient?.full_name,
          patientUserId: apt.patient_id,
          clinicName: apt.clinic?.name,
          clinicAddress: apt.clinic?.address,
          doctorName: apt.doctor?.name,
          doctorSpecialization: apt.doctor?.specialization,
          scheduledAt: apt.scheduled_at,
          reason: status === 'cancelled' ? 'Clinic could not accommodate this booking request.' : undefined,
        }),
      })

      setMessage({
        type: 'success',
        text: `Appointment [${scheduleId}] ${status}. Automated Email and SMS confirmation with Schedule ID have been sent to the patient.`,
      })
    } else {
      setMessage({
        type: 'error',
        text: 'We could not update this appointment. Please try again.',
      })
    }
    setUpdatingId(null)
  }

  const openRescheduleModal = (apt: ClinicAppointment) => {
    setReschedulingApt(apt)
    setRescheduleDate(new Date(apt.scheduled_at))
    setSelectedDoctorId(apt.doctor_id || '')
    setRescheduleReason(apt.doctor && !apt.doctor.is_available ? 'Doctor unavailable - clinic reassigning' : '')
  }

  const handleRescheduleSubmit = async () => {
    if (!reschedulingApt || !rescheduleDate) return
    setIsSubmittingReschedule(true)
    setMessage(null)

    try {
      const [time, modifier] = selectedTimeSlot.split(' ')
      let [hours, minutes] = time.split(':').map(Number)
      if (modifier === 'PM' && hours < 12) hours += 12
      if (modifier === 'AM' && hours === 12) hours = 0

      const newDate = new Date(rescheduleDate)
      newDate.setHours(hours, minutes, 0, 0)

      const response = await fetch('/api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: reschedulingApt.id,
          newScheduledAt: newDate.toISOString(),
          newDoctorId: selectedDoctorId || reschedulingApt.doctor_id,
          reason: rescheduleReason || 'Clinic adjusted schedule',
          initiatedBy: 'clinic',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule appointment')
      }

      setMessage({
        type: 'success',
        text: `Appointment [${formatScheduleId(reschedulingApt.id)}] rescheduled successfully! Automated Email and SMS have been dispatched to the patient.`,
      })

      setReschedulingApt(null)
      fetchAppointments()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not complete rescheduling.',
      })
    } finally {
      setIsSubmittingReschedule(false)
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    const scheduleId = formatScheduleId(apt.id).toLowerCase()
    const patientName = apt.patient?.full_name?.toLowerCase() || ''
    const patientEmail = apt.patient?.email?.toLowerCase() || ''
    const doctorName = apt.doctor?.name?.toLowerCase() || ''
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return scheduleId.includes(q) || patientName.includes(q) || patientEmail.includes(q) || doctorName.includes(q)
  })

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading appointment management...</div>

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Care requests & schedule</p>
          <h1 className="mt-1 text-3xl font-bold text-emerald-950">Appointment management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review incoming requests with Schedule IDs, reassign unavailable doctors, and trigger automated multi-channel notifications.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by SCH- ID or patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          <Info className="size-5 shrink-0" />
          <div className="flex-1 font-medium">{message.text}</div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredAppointments.map((apt) => {
          const scheduleId = formatScheduleId(apt.id)
          const isDoctorUnavailable = apt.doctor && apt.doctor.is_available === false && apt.status !== 'cancelled' && apt.status !== 'completed'

          return (
            <Card
              key={apt.id}
              className={`overflow-hidden transition-all ${
                isDoctorUnavailable ? 'border-amber-300 bg-amber-50/25 shadow-sm' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                        {(apt.patient?.full_name || apt.patient?.email || 'P')[0].toUpperCase()}
                      </div>

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

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Patient:
                        </span>
                        <h3 className="truncate text-lg font-bold text-emerald-950">
                          {apt.patient?.full_name || apt.patient?.email || 'Patient'}
                        </h3>
                      </div>

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
                        Dr. {apt.doctor?.name || 'Unassigned'}
                        {apt.doctor?.specialization ? ` (${apt.doctor.specialization})` : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-emerald-700" />
                        {format(new Date(apt.scheduled_at), 'PPp')}
                      </span>
                      {apt.patient?.email && (
                        <span className="flex items-center gap-1 text-xs">
                          <Mail className="size-3.5 text-slate-500" />
                          {apt.patient.email}
                        </span>
                      )}
                      {apt.patient?.phone && (
                        <span className="flex items-center gap-1 text-xs">
                          <MessageSquare className="size-3.5 text-slate-500" />
                          {apt.patient.phone}
                        </span>
                      )}
                    </div>

                    {isDoctorUnavailable && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                        <div className="flex items-center gap-2">
                          <TriangleAlert className="size-4 shrink-0 text-amber-700" />
                          <span>
                            <strong>Dr. {apt.doctor?.name}</strong> is currently marked unavailable. You can click <strong>Reschedule / Reassign</strong> to shift this appointment to another doctor or time.
                          </span>
                        </div>
                      </div>
                    )}

                    {apt.notes && (
                      <p className="rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm text-muted-foreground">
                        {apt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Reschedule / Reassign Button */}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <Button
                        size="sm"
                        variant={isDoctorUnavailable ? 'default' : 'outline'}
                        className={isDoctorUnavailable ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                        onClick={() => openRescheduleModal(apt)}
                      >
                        <CalendarSync className="mr-1.5 size-4" />
                        {isDoctorUnavailable ? 'Reassign / Reschedule' : 'Reschedule'}
                      </Button>
                    )}

                    {/* Accept / Cancel Buttons */}
                    {apt.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          disabled={updatingId === apt.id}
                          onClick={() => updateStatus(apt.id, 'confirmed')}
                          className="bg-emerald-700 hover:bg-emerald-800"
                        >
                          <CheckCircle className="mr-1 size-4" /> {updatingId === apt.id ? 'Updating' : 'Accept'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          disabled={updatingId === apt.id}
                          onClick={() => updateStatus(apt.id, 'cancelled')}
                        >
                          <XCircle className="mr-1 size-4" /> Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
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
                {searchQuery ? 'Try another search term.' : 'New patient appointment requests will appear here.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Clinic Reschedule & Reassign Modal */}
      {reschedulingApt && (
        <Dialog open={!!reschedulingApt} onOpenChange={(open) => !open && setReschedulingApt(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-emerald-950">
                <CalendarSync className="size-5 text-emerald-700" />
                Reschedule or Reassign Appointment
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Patient:</span>
                <span className="font-semibold text-emerald-950">{reschedulingApt.patient?.full_name || 'Patient'}</span>
                <span>•</span>
                <span>Schedule ID:</span>
                <span className="font-mono font-bold text-emerald-800">{formatScheduleId(reschedulingApt.id)}</span>
              </div>
            </DialogHeader>

            <div className="space-y-5 pt-3">
              {/* Select Doctor to Reassign */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-emerald-950">Assign Doctor</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {clinicDoctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`flex flex-col items-start p-2.5 rounded-md border text-left text-xs transition-all ${
                        selectedDoctorId === doc.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">Dr. {doc.name}</span>
                        {doc.is_available ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Available</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Away</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{doc.specialization || 'General practice'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-emerald-950">Select Date</Label>
                <div className="flex justify-center rounded-lg border border-emerald-100 bg-white p-2">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
              </div>

              {/* Select Time Slot */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-emerald-950">Select Time Slot</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                        selectedTimeSlot === slot
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Clock className="size-3" />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Reason to send */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-emerald-950">Note to Patient</Label>
                <Input
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Doctor is unavailable; reassigned to Dr. Smith"
                  className="text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button variant="outline" onClick={() => setReschedulingApt(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!rescheduleDate || isSubmittingReschedule}
                  onClick={handleRescheduleSubmit}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {isSubmittingReschedule ? 'Saving & Sending...' : 'Update & Notify Patient (Email + SMS)'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}