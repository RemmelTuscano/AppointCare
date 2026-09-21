'use client'

import Link from 'next/link'
import { useEffect, useEffectEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Building2, Calendar, CheckCircle, ChevronDown, Clock, MapPin, Plus, UserCheck, UserRound, UserX, X, type LucideIcon } from 'lucide-react'
import type { Doctor } from '@/types/database'

type RegisteredClinic = {
  id: string
  name: string
  address: string
}

const SPECIALIZATIONS = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Dentistry',
  'Family Medicine',
  'Internal Medicine',
  'Neurology',
  'Obstetrics and Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Other',
]

export default function ClinicDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [clinic, setClinic] = useState<RegisteredClinic | null>(null)
  const [newDoctor, setNewDoctor] = useState({ name: '', specialization: '' })
  const [specializationOpen, setSpecializationOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const fetchData = useEffectEvent(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setMessage('Your session has expired. Please sign in again.')
        return
      }

      const { data: ownedClinic, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, address')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clinicError) {
        setMessage('We could not load your clinic profile. Please try again.')
        return
      }
      let clinic = ownedClinic

      if (!clinic) {
        const { data: doctorRecord } = await supabase
          .from('doctors')
          .select('clinic:clinics(id, name, address)')
          .limit(1)
          .maybeSingle()

        clinic = (doctorRecord?.clinic as RegisteredClinic | null) || null
      }

      if (!clinic) {
        setMessage('No clinic profile is linked to this account yet.')
        return
      }

      setClinic(clinic)
      const { data, error: doctorsError } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })

      if (doctorsError) {
        setMessage('We could not load your doctors. Please try again.')
        return
      }
      setDoctors(data || [])
      setMessage(null)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [supabase])

  const addDoctor = async () => {
    if (!clinic || !newDoctor.name.trim()) return
    setIsSaving(true)
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        clinic_id: clinic.id,
        name: newDoctor.name,
        specialization: newDoctor.specialization,
      })
      .select()
      .single()

    if (error || !data) {
      setMessage('We could not add this doctor. Please try again.')
    } else {
      setDoctors((current) => [data, ...current])
      setNewDoctor({ name: '', specialization: '' })
      setSpecializationOpen(false)
      setIsDialogOpen(false)
    }
    setIsSaving(false)
  }

  const toggleAvailability = async (id: string, current: boolean) => {
    setUpdatingDoctorId(id)
    const nextAvailability = !current
    const targetDoctor = doctors.find((d) => d.id === id)

    const { error } = await supabase
      .from('doctors')
      .update({ is_available: nextAvailability })
      .eq('id', id)
    
    if (error) {
      setMessage('We could not update availability. Please try again.')
      setUpdatingDoctorId(null)
      return
    }

    setDoctors((currentDoctors) => currentDoctors.map((doctor) => 
      doctor.id === id ? { ...doctor, is_available: nextAvailability } : doctor
    ))

    // If marked unavailable, check and automate notifications to affected scheduled patients
    if (!nextAvailability && targetDoctor) {
      try {
        const { data: affectedApts } = await supabase
          .from('appointments')
          .select('id, scheduled_at, patient:profiles(id, full_name, email, phone), clinic:clinics(name, address)')
          .eq('doctor_id', id)
          .in('status', ['pending', 'confirmed'])

        if (affectedApts && affectedApts.length > 0) {
          let notifiedCount = 0
          for (const apt of affectedApts) {
            const patientData = apt.patient as { id?: string; full_name?: string | null; email?: string | null; phone?: string | null } | null
            const clinicData = apt.clinic as { name?: string | null; address?: string | null } | null

            await fetch('/api/notifications/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'doctor_unavailable',
                appointmentId: apt.id,
                patientEmail: patientData?.email,
                patientPhone: patientData?.phone,
                patientName: patientData?.full_name,
                patientUserId: patientData?.id,
                clinicName: clinicData?.name || clinic?.name,
                clinicAddress: clinicData?.address || clinic?.address,
                doctorName: targetDoctor.name,
                scheduledAt: apt.scheduled_at,
                rescheduleUrl: '/patient/appointments',
              }),
            })
            notifiedCount++
          }

          setMessage(`Dr. ${targetDoctor.name} marked unavailable. Automated Email & SMS alerts with Schedule IDs were sent to ${notifiedCount} affected patient(s). You can reassign or reschedule their visits under Appointments.`)
          setUpdatingDoctorId(null)
          return
        }
      } catch (err) {
        console.warn('Could not complete automated patient alerts:', err)
      }
      setMessage(`Dr. ${targetDoctor.name} marked unavailable. No active upcoming appointments were affected.`)
    } else {
      setMessage(`Dr. ${targetDoctor?.name || 'Doctor'} marked available for patient booking.`)
    }

    setUpdatingDoctorId(null)
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading doctors...</div>

  const availableDoctors = doctors.filter((doctor) => doctor.is_available).length
  const unavailableDoctors = doctors.length - availableDoctors

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Your care team</p>
          <h1 className="mt-1 text-3xl font-bold text-emerald-950">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Keep your doctors and booking availability up to date.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 size-4" /> Add doctor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <div className="flex items-start justify-between gap-4">
              <DialogHeader>
                <DialogTitle>Add New Doctor</DialogTitle>
              </DialogHeader>
              <button
                type="button"
                aria-label="Cancel adding doctor"
                title="Cancel"
                onClick={() => {
                  setNewDoctor({ name: '', specialization: '' })
                  setSpecializationOpen(false)
                  setIsDialogOpen(false)
                }}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  placeholder="Dr. John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-specialization">Specialization</Label>
                <div className="relative">
                  <button
                    id="doctor-specialization"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={specializationOpen}
                    onClick={() => setSpecializationOpen((open) => !open)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <span className={newDoctor.specialization ? 'text-foreground' : 'text-muted-foreground'}>
                      {newDoctor.specialization || 'Select a specialization'}
                    </span>
                    <ChevronDown className={`size-4 text-gray-500 transition-transform ${specializationOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {specializationOpen && (
                    <div role="listbox" aria-label="Doctor specialization choices" className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-emerald-200 bg-white p-1 shadow-xl">
                      {SPECIALIZATIONS.map((specialization) => (
                        <button
                          key={specialization}
                          type="button"
                          role="option"
                          aria-selected={newDoctor.specialization === specialization}
                          onClick={() => {
                            setNewDoctor({ ...newDoctor, specialization })
                            setSpecializationOpen(false)
                          }}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-emerald-950 hover:bg-emerald-50"
                        >
                          {specialization}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button disabled={isSaving || !newDoctor.name.trim() || !newDoctor.specialization} onClick={addDoctor} className="w-full">
                {isSaving ? 'Adding doctor...' : 'Add doctor'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.includes('could not') || message.includes('expired') || message.includes('No clinic') ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          {message}
        </div>
      )}

      {clinic && (
        <Card className="border-emerald-100 bg-emerald-50/35">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-700">Registered clinic</p>
                <h2 className="truncate text-lg font-semibold text-emerald-950">{clinic.name}</h2>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <p className="flex items-center gap-2 text-sm text-muted-foreground sm:text-right">
                <MapPin className="size-4 shrink-0 text-emerald-700" />
                <span>{clinic.address}</span>
              </p>
              <Button asChild variant="outline" size="sm"><Link href="/clinic/account">Edit clinic</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total doctors" value={doctors.length} icon={Calendar} color="blue" />
        <StatCard title="Available" value={availableDoctors} icon={CheckCircle} color="green" />
        <StatCard title="Unavailable" value={unavailableDoctors} icon={Clock} color="yellow" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-emerald-950">Your doctors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <Card key={doctor.id} className="transition-transform duration-200 hover:-translate-y-0.5">
                <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <UserRound className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-emerald-950">{doctor.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{doctor.specialization || 'General practice'}</p>
                  </div>
                </div>
                <div className={cn(
                  "rounded-full p-2",
                  doctor.is_available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                )}>
                  {doctor.is_available ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                </div>
              </div>
              
              <div className="mt-5 flex items-center justify-between border-t border-emerald-100 pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {doctor.is_available ? 'Available for booking' : 'Unavailable'}
                </span>
                <Switch 
                  checked={doctor.is_available}
                  className={updatingDoctorId === doctor.id ? 'pointer-events-none opacity-50' : ''}
                  onCheckedChange={() => toggleAvailability(doctor.id, doctor.is_available)}
                />
              </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!message && doctors.length === 0 && <p className="py-8 text-center text-muted-foreground">No doctors have been added yet.</p>}
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}