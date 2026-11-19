import { AppointmentHistory } from '@/components/ui/dashboard/appointment-history'

export default async function ClinicAppointmentHistory({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const { page } = await searchParams
  return <AppointmentHistory role="clinic" page={page} />
}
