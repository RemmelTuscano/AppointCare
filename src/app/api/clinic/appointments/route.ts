import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId query parameter is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Database service is not configured.' }, { status: 500 })
    }

    // Service role bypasses RLS so clinic staff always see patient names and details properly
    const supabase = createClient(url, serviceRoleKey)

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patient:profiles(id, full_name, email, phone, location), doctor:doctors(id, name, specialization, is_available), clinic:clinics(id, name, address)')
      .eq('clinic_id', clinicId)
      .order('scheduled_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch clinic appointments:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointments: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch clinic appointments' },
      { status: 500 }
    )
  }
}
