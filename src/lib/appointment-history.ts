import type { SupabaseClient } from '@supabase/supabase-js'

export const HISTORY_PAGE_SIZE = 50

export type HistoryAppointment = {
  id: string
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  patient: { full_name: string | null } | null
  clinic: { name: string; address: string } | null
  doctor: { name: string; specialization: string | null } | null
}

export function historyPage(value: string | string[] | undefined): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page <= Math.floor(Number.MAX_SAFE_INTEGER / HISTORY_PAGE_SIZE) ? page : 1
}

export async function loadAppointmentHistory(
  client: SupabaseClient,
  userId: string,
  role: 'patient' | 'clinic',
  page: number,
  now: Date,
) {
  let ownerColumn = 'patient_id'
  let ownerId = userId

  if (role === 'clinic') {
    const { data: clinic, error } = await client
      .from('clinics')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Could not verify clinic ownership: ${error.message}`)
    if (!clinic) throw new Error('No clinic profile is linked to this account.')
    ownerColumn = 'clinic_id'
    ownerId = clinic.id
  }

  const start = (page - 1) * HISTORY_PAGE_SIZE
  const { data, error } = await client
    .from('appointments')
    .select('id, scheduled_at, status, notes, patient:profiles(full_name), clinic:clinics(name, address), doctor:doctors(name, specialization)')
    .eq(ownerColumn, ownerId)
    .lt('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .order('id', { ascending: false })
    .range(start, start + HISTORY_PAGE_SIZE)
    .overrideTypes<HistoryAppointment[], { merge: false }>()

  if (error) throw new Error(`Could not load appointment history: ${error.message}`)
  return { appointments: data.slice(0, HISTORY_PAGE_SIZE), hasNextPage: data.length > HISTORY_PAGE_SIZE }
}
