import { formatScheduleId } from '@/lib/schedule-id'

export type ClinicAppointmentStatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

type FilterableAppointment = {
  id: string
  status: string
  scheduled_at: string
  patient: { full_name: string | null; email: string | null } | null
  doctor: { name: string | null } | null
}

export function filterClinicAppointments<T extends FilterableAppointment>(
  appointments: T[],
  status: ClinicAppointmentStatusFilter,
  search: string,
  day: string,
): T[] {
  const query = search.toLowerCase().trim()
  return appointments.filter((appointment) => {
    if (status !== 'all' && appointment.status !== status) return false
    if (day && new Date(appointment.scheduled_at).getDate() !== Number(day)) return false
    if (!query) return true
    return [
      formatScheduleId(appointment.id),
      appointment.patient?.full_name,
      appointment.patient?.email,
      appointment.doctor?.name,
    ].some((value) => value?.toLowerCase().includes(query))
  }).sort((first, second) => {
    if (!day) return 0
    return new Date(first.scheduled_at).getTime() - new Date(second.scheduled_at).getTime()
  })
}
