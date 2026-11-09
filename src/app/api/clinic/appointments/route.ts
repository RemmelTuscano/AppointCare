import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clinicId = searchParams.get('clinicId')

  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId query parameter is required' }, { status: 400 })
  }

  const sessionClient = await createClient()
  if (!sessionClient) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 500 })
  }

  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })
  }

  const { data: clinic, error: clinicError } = await admin
    .from('clinics')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (clinicError) {
    console.error('Failed to verify clinic ownership:', clinicError.message)
    return NextResponse.json({ error: 'Could not verify clinic access.' }, { status: 500 })
  }
  if (!clinic || clinic.id !== clinicId) {
    return NextResponse.json({ error: 'You cannot access this clinic.' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('appointments')
    .select('*, patient:profiles(id, full_name, email, phone, location), doctor:doctors(id, name, specialization, is_available), clinic:clinics(id, name, address)')
    .eq('clinic_id', clinic.id)
    .order('scheduled_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch clinic appointments:', error.message)
    return NextResponse.json({ error: 'Failed to fetch clinic appointments.' }, { status: 500 })
  }

  return NextResponse.json({ appointments: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}
