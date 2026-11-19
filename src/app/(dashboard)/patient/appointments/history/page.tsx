import { AppointmentHistory } from '@/components/ui/dashboard/appointment-history'

export default async function PatientAppointmentHistory({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const { page } = await searchParams
  return <AppointmentHistory role="patient" page={page} />
}
