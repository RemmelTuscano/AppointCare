import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.replace(':', '')
  const origin = host ? `${protocol}://${host}` : requestUrl.origin
  const code = searchParams.get('code')
  const authError = searchParams.get('error')
  const authErrorCode = searchParams.get('error_code')
  const requestedRole = searchParams.get('role') === 'clinic' ? 'clinic' : 'patient'
  const fallbackDashboard = '/patient/dashboard'

  if (authError) {
    const message = authErrorCode === 'otp_expired'
      ? 'This confirmation link has expired or was already used. Please request a new confirmation email.'
      : 'We could not confirm your account. Please request a new confirmation email and try again.'
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)
  }

  if (code) {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = profile?.role || user.user_metadata.role || requestedRole

        if (!profile) {
          await supabase.from('profiles').upsert({
            id: user.id,
            role: userRole,
            email: user.email,
            full_name: user.user_metadata.full_name || user.email,
            location: user.user_metadata.location || null,
          })
        }

        if (userRole === 'clinic') {
          await supabase.from('clinics').upsert({
            user_id: user.id,
            name: user.user_metadata.full_name || user.email || 'New clinic',
            address: user.user_metadata.location || 'Address pending',
            email: user.email,
          }, { onConflict: 'user_id' })
        }

        const redirectPath = userRole === 'clinic' || userRole === 'patient' ? `/${userRole}/dashboard` : fallbackDashboard
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
      return NextResponse.redirect(`${origin}${fallbackDashboard}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('This confirmation link is invalid or has expired. Please request a new confirmation email.')}`)
}