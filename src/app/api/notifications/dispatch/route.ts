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

    const result = await dispatchAutomatedNotifications(body)

    // Also persist in-app notifications to database if Supabase credentials available
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
