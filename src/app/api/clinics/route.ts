import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: 'Clinic directory is not configured.' }, { status: 500 })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('clinics')
    .select('id, user_id, name, address, doctors(id, name, specialization, is_available)')
    .eq('is_verified', true)
    .order('name')

  if (error) {
    console.error('Clinic directory query failed:', error.message)
    return NextResponse.json({ error: 'Unable to load the clinic directory.' }, { status: 500 })
  }

  return NextResponse.json({ clinics: data })
}