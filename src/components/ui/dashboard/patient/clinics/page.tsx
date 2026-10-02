'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, CheckCircle2, CircleAlert, MapPin, Stethoscope, UserCheck, UserRound, UsersRound } from 'lucide-react'

type ClinicDoctor = {
  id: string
  name: string
  specialization: string | null
  is_available: boolean
}

type Clinic = {
  id: string
  user_id: string
  name: string
  address: string
  doctors: ClinicDoctor[] | null
}

type BookingResult = {
  type: 'success' | 'error'
  title: string
  message: string
  scheduledAt?: string
}

export default function PatientClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [bookingStarted, setBookingStarted] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [isBookingConfirmationOpen, setIsBookingConfirmationOpen] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch('/api/clinics')
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Unable to load the clinic directory.')

        setClinics(payload.clinics || [])
        setMessage(null)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load the clinic directory.')
      } finally {
        setLoading(false)
      }
    }
    fetchClinics()
  }, [])

  const loadDoctors = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    const availableDocs = clinic.doctors?.filter((doctor) => doctor.is_available) || []
    setDoctors(availableDocs)
    setSelectedDoctor('')
    setSelectedDate(undefined)
    setNotes('')
    setBookingStarted(false)
  }

  const bookAppointment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !selectedClinic || !selectedDate || !selectedDoctor) {
      setBookingResult({
        type: 'error',
        title: 'Appointment request not sent',
        message: !user ? 'Your session has expired. Please sign in again.' : 'Choose a clinic, doctor, and date before requesting an appointment.',
      })
      return
    }
    setIsBooking(true)
    setIsBookingConfirmationOpen(false)

    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(9, 0, 0, 0) // Default to 9 AM

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    const chosenDoctor = doctors.find((d) => d.id === selectedDoctor)

    let bookingResponse: Response
    let bookingPayload: { error?: string; code?: string; appointment?: { id: string; scheduled_at: string } }
    try {
      bookingResponse = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: selectedClinic.id,
          doctorId: selectedDoctor,
          scheduledAt: scheduledAt.toISOString(),
          notes,
        }),
      })
      bookingPayload = await bookingResponse.json()
    } catch (error) {
      setBookingResult({
        type: 'error',
        title: 'Appointment request not sent',
        message: error instanceof Error ? error.message : 'We could not request this appointment. Please try again.',
      })
      setIsBooking(false)
      return
    }

    if (!bookingResponse.ok || !bookingPayload.appointment) {
      setBookingResult({
        type: 'error',
        title: 'Appointment request not sent',
        message: bookingPayload.error || 'We could not request this appointment. Please try again.',
      })
      if (bookingResponse.status === 409 && ['CLINIC_UNAVAILABLE', 'DOCTOR_UNAVAILABLE'].includes(bookingPayload.code || '')) {
        setSelectedClinic(null)
        setDoctors([])
        setSelectedDoctor('')
        setSelectedDate(undefined)
        setBookingStarted(false)
      }
      setIsBooking(false)
      return
    }

    const apt = bookingPayload.appointment

    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action: 'appointment_requested',
      entity_type: 'appointment',
      entity_id: apt.id,
      summary: `Appointment requested at ${selectedClinic.name}`,
      metadata: { clinic: selectedClinic.name, doctor: chosenDoctor?.name, scheduledAt: apt.scheduled_at },
    })

    let notificationFailed = false
    try {
      const notificationResponse = await fetch('/api/notifications/dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'created', appointmentId: apt.id, patientEmail: user.email, patientPhone: profile?.phone, patientName: profile?.full_name, patientUserId: user.id, clinicUserId: selectedClinic.user_id, clinicName: selectedClinic.name, clinicAddress: selectedClinic.address, doctorName: chosenDoctor?.name, doctorSpecialization: chosenDoctor?.specialization, scheduledAt: apt.scheduled_at, notes }),
      })
      notificationFailed = !notificationResponse.ok
    } catch {
      notificationFailed = true
    }

    setSelectedClinic(null)
    setSelectedDate(undefined)
    setSelectedDoctor('')
    setNotes('')
    setBookingResult({
      type: 'success',
      title: 'Appointment requested',
      message: notificationFailed
        ? `Your request was saved for ${selectedClinic.name}, but notification delivery could not be confirmed. The clinic will review your appointment shortly.`
        : `Your request has been sent to ${selectedClinic.name}${chosenDoctor?.name ? ` with ${chosenDoctor.name}` : ''}. The clinic will confirm your appointment shortly.`,
      scheduledAt: apt.scheduled_at,
    })
    setIsBooking(false)
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-emerald-700">Book your next visit</p>
        <h1 className="mt-1 text-3xl font-bold text-emerald-950">Find a clinic</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a verified clinic and request an appointment with an available doctor.</p>
      </header>

      {message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      )}

      {loading && <div className="py-12 text-center text-muted-foreground">Loading clinic directory...</div>}

      {!loading && !selectedClinic && <div className="flex max-h-[min(70vh,48rem)] flex-col gap-4 overflow-y-auto overflow-x-hidden pb-4 pr-2">
        {clinics.map((clinic) => (
          <Card key={clinic.id} className="w-full shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-emerald-950 sm:text-2xl">
                <Stethoscope className="w-5 h-5 text-emerald-700" />
                {clinic.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {clinic.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                {clinic.doctors?.filter((doctor) => doctor.is_available).length || 0} doctors available
              </div>

              <div className="border-t border-emerald-100 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-emerald-800"><UsersRound className="size-3.5" />Available doctors</p>
                <div className="space-y-2">
                  {clinic.doctors?.filter((doctor) => doctor.is_available).length ? clinic.doctors.filter((doctor) => doctor.is_available).map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between gap-3 rounded-md bg-emerald-50/55 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserRound className="size-4 shrink-0 text-emerald-700" />
                        <span className="truncate text-sm font-medium text-emerald-950">{doctor.name}</span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-emerald-700">Available</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No doctors are available for booking right now.</p>
                  )}
                </div>
              </div>
              
              <Button className="w-full" disabled={!clinic.doctors?.some((doctor) => doctor.is_available)} onClick={() => loadDoctors(clinic)}>
                {clinic.doctors?.some((doctor) => doctor.is_available) ? 'View clinic' : 'No doctors available'}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!message && clinics.length === 0 && (
          <Card className="w-full shrink-0">
            <CardContent className="p-12 text-center text-muted-foreground">
              No verified clinics are available yet.
            </CardContent>
          </Card>
        )}
      </div>
      }

      {!loading && selectedClinic && (
        <section className="space-y-6">
          <Button variant="ghost" className="px-0 text-emerald-800 hover:bg-transparent hover:text-emerald-950" onClick={() => setSelectedClinic(null)}>
            <ArrowLeft className="mr-2 size-4" /> Back to clinics
          </Button>

          <div className="border-b border-emerald-100 pb-5">
            <p className="text-sm font-medium text-emerald-700">Clinic information</p>
            <h2 className="mt-1 text-3xl font-bold text-emerald-950">{selectedClinic.name}</h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {selectedClinic.address}
            </div>
          </div>

          {!bookingStarted ? (
            <Card>
              <CardHeader>
                <CardTitle>Choose a doctor</CardTitle>
                <p className="text-sm text-muted-foreground">Select an available doctor to continue with your appointment request.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => setSelectedDoctor(doctor.id)}
                      className={cn(
                        'rounded-md border p-4 text-left transition-colors focus:outline-none focus:ring-3 focus:ring-emerald-100',
                        selectedDoctor === doctor.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                          : 'border-border hover:border-emerald-300 hover:bg-emerald-50/40',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <UserRound className="mt-0.5 size-5 text-emerald-700" />
                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{doctor.specialization || 'General practice'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <Button disabled={!selectedDoctor} onClick={() => setBookingStarted(true)}>Continue to booking</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Request an appointment</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Booking with {doctors.find((doctor) => doctor.id === selectedDoctor)?.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-3 font-medium text-emerald-950">Select a date</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label htmlFor="appointment-notes" className="mb-3 block font-medium text-emerald-950">Notes (optional)</label>
                  <textarea
                    id="appointment-notes"
                    name="notes"
                    className="h-24 w-full resize-none rounded-md border border-input p-3 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100"
                    placeholder="Any specific concerns..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="sm:flex-1" onClick={() => setBookingStarted(false)}>Back to doctor selection</Button>
                  <Button className="sm:flex-1" disabled={!selectedDate} onClick={() => setIsBookingConfirmationOpen(true)}>
                    <CheckCircle2 className="mr-2 size-4" /> Review request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      <Dialog open={isBookingConfirmationOpen} onOpenChange={setIsBookingConfirmationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm appointment request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <p className="text-muted-foreground">Please review the details before sending your request.</p>
            <dl className="grid gap-3 rounded-md border border-border/70 bg-muted/40 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Clinic</dt>
                <dd className="mt-1 font-medium text-foreground">{selectedClinic?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Doctor</dt>
                <dd className="mt-1 font-medium text-foreground">{doctors.find((doctor) => doctor.id === selectedDoctor)?.name || 'To be assigned'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Date</dt>
                <dd className="mt-1 font-medium text-foreground">{selectedDate?.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Time</dt>
                <dd className="mt-1 font-medium text-foreground">9:00 AM</dd>
              </div>
              {notes.trim() && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-foreground">{notes}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={isBooking} onClick={() => setIsBookingConfirmationOpen(false)}>Back</Button>
              <Button disabled={isBooking} onClick={() => void bookAppointment()}>
                {isBooking ? 'Sending request...' : 'Confirm request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingResult !== null} onOpenChange={(open) => { if (!open) setBookingResult(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {bookingResult?.type === 'success'
                ? <CheckCircle2 className="size-5 text-emerald-600" />
                : <CircleAlert className="size-5 text-destructive" />}
              {bookingResult?.title}
            </DialogTitle>
          </DialogHeader>
          {bookingResult && (
            <div className="space-y-4 pt-2 text-sm">
              <p className="text-muted-foreground">{bookingResult.message}</p>
              {bookingResult.scheduledAt && (
                <p className="text-muted-foreground">
                  Requested date: <span className="font-medium text-foreground">{new Date(bookingResult.scheduledAt).toLocaleDateString()}</span>
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setBookingResult(null)}>Close</Button>
                {bookingResult.type === 'success' && (
                  <Button onClick={() => { setBookingResult(null); router.push('/patient/appointments') }}>View my appointments</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}