import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationList, type AppNotification } from '@/components/ui/notification-list'
import { Bell, CheckCircle2, Mail, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let notifications: AppNotification[] = []
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(30)
    notifications = (data as AppNotification[]) || []
  } catch (err) {
    console.warn('Could not fetch notifications:', err)
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-emerald-700">Stay informed</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">Notifications & Automation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review automated multi-channel notifications (Email & SMS with Schedule Reference Numbers) and appointment alerts.
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Automation Status Banner */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
              <Sparkles className="size-4 text-emerald-700" />
              Automated Notification Channels Active
            </CardTitle>
            <CardDescription className="text-emerald-800">
              Your account is connected to instant appointment automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <Mail className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Email Confirmation</p>
                  <p className="text-muted-foreground mt-0.5">Sends full confirmation &amp; Schedule ID (#SCH) immediately.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <MessageSquare className="size-4 shrink-0 text-teal-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Automated SMS</p>
                  <p className="text-muted-foreground mt-0.5">Instant SMS on booking, rescheduling, and status updates.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <Bell className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Doctor Availability</p>
                  <p className="text-muted-foreground mt-0.5">Automated prompt to reschedule if your doctor becomes away.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-950">Notification history</CardTitle>
            <CardDescription>Recent alerts, confirmations, and schedule updates</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationList notifications={notifications} appointmentPath="/patient/appointments" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
