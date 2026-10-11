import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchAutomatedNotifications, type NotificationPayload } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const body: NotificationPayload = await request.json()

    if (!body.appointmentId || !body.type) {
      return NextResponse.json(
        { error: 'appointmentId and type are required' },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Client queries may be blocked by RLS and omit patient contact details.
    if (body.patientUserId && url && serviceRoleKey && (!body.patientEmail || !body.patientPhone)) {
      const lookup = createClient(url, serviceRoleKey)
      const { data: patient } = await lookup.from('profiles').select('email, phone, full_name').eq('id', body.patientUserId).maybeSingle()
      body.patientEmail = body.patientEmail || patient?.email
      body.patientPhone = body.patientPhone || patient?.phone
      body.patientName = body.patientName || patient?.full_name
    }

    const result = await dispatchAutomatedNotifications(body)

    // Also persist in-app notifications to database if Supabase credentials available

    if (url && serviceRoleKey && result.inAppNotifications.length > 0) {
      const supabase = createClient(url, serviceRoleKey)
      for (const item of result.inAppNotifications) {
        await supabase.from('notifications').insert({
          user_id: item.userId,
          type: 'in_app',
          title: item.title,
          message: item.message,
          metadata: {
            appointment_id: body.appointmentId,
            schedule_id: result.scheduleId,
            event: body.type,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      scheduleId: result.scheduleId,
      email: result.email,
      sms: result.sms,
    })
  } catch (error) {
    console.error('Dispatch notification error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to dispatch notification' },
      { status: 500 }
    )
  }
}
