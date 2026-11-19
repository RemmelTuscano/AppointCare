import Link from 'next/link'
import { CalendarDays, History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { historyPage, loadAppointmentHistory } from '@/lib/appointment-history'
import { formatScheduleId } from '@/lib/schedule-id'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HistoryTime } from '@/components/ui/dashboard/history-time'

export async function AppointmentHistory({ role, page: pageParam }: {
  role: 'patient' | 'clinic'
  page: string | string[] | undefined
}) {
  const sessionClient = await createClient()
  if (!sessionClient) throw new Error('Authentication is not configured.')
  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user) redirect('/login')

  const client = role === 'clinic' ? createAdminClient() : sessionClient
  if (!client) throw new Error('Database service is not configured.')
  const page = historyPage(pageParam)

  let result
  try {
    result = await loadAppointmentHistory(client, user.id, role, page, new Date())
  } catch (error) {
    console.error('Appointment history error:', error)
    return <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not load appointment history. Please refresh the page or contact support.</div>
  }

  const path = `/${role}/appointments/history`
  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-sm font-medium text-emerald-700">Your care schedule</p>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-emerald-950"><History className="size-7" />Appointment history</h1>
        <p className="text-sm text-muted-foreground">Appointments whose scheduled time has passed, including all statuses.</p>
        <Button asChild variant="outline"><Link href={`/${role}/appointments`}>Back to appointments</Link></Button>
      </header>

      {result.appointments.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground"><CalendarDays className="mx-auto mb-4 size-12 text-emerald-200" /><p>No past appointments found.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {result.appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardContent className="space-y-3 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900">{formatScheduleId(appointment.id)}</span>
                  <h2 className="text-lg font-semibold text-emerald-950">{role === 'clinic' ? appointment.patient?.full_name || 'Patient' : appointment.clinic?.name || 'Clinic'}</h2>
                  <Badge variant={appointment.status === 'cancelled' ? 'destructive' : appointment.status === 'confirmed' ? 'default' : 'outline'} className="capitalize">{appointment.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <HistoryTime value={appointment.scheduled_at} />
                  {' · '}{appointment.doctor?.name ? `Dr. ${appointment.doctor.name}` : 'Doctor not assigned'}
                  {appointment.doctor?.specialization ? ` (${appointment.doctor.specialization})` : ''}
                </p>
                {role === 'patient' && appointment.clinic?.address && <p className="text-sm text-muted-foreground">{appointment.clinic.address}</p>}
                {appointment.notes && <p className="whitespace-pre-wrap text-sm text-foreground"><span className="font-semibold">Notes: </span>{appointment.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {(page > 1 || result.hasNextPage) && (
        <nav aria-label="History pages" className="flex items-center gap-3">
          {page > 1 && <Button asChild variant="outline"><Link href={`${path}?page=${page - 1}`}>Previous</Link></Button>}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {result.hasNextPage && <Button asChild variant="outline"><Link href={`${path}?page=${page + 1}`}>Next</Link></Button>}
        </nav>
      )}
    </div>
  )
}
