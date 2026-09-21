import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationList, type AppNotification } from '@/components/ui/notification-list'
import { Bell, Mail, MessageSquare, Sparkles } from 'lucide-react'

export default async function ClinicNotificationsPage() {
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
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">Clinic Notifications & Automation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track clinic alerts, booking requests, and automated patient communication logs (Email &amp; SMS with Schedule IDs).
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Clinic Automation Overview */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
              <Sparkles className="size-4 text-emerald-700" />
              Patient Communication Automation
            </CardTitle>
            <CardDescription className="text-emerald-800">
              Automated notifications sent when clinic actions are performed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <Mail className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Schedule ID Confirmation</p>
                  <p className="text-muted-foreground mt-0.5">Automated HTML emails sent upon request, confirmation &amp; reschedule.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <MessageSquare className="size-4 shrink-0 text-teal-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Automated SMS Gateway</p>
                  <p className="text-muted-foreground mt-0.5">Instant text dispatch to patients with Ref #SCH for fast reference.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                <Bell className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Doctor Availability Triggers</p>
                  <p className="text-muted-foreground mt-0.5">Toggling doctor availability auto-alerts affected patients to reschedule.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-950">Notification history</CardTitle>
            <CardDescription>Recent patient actions, booking notices, and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationList notifications={notifications} appointmentPath="/clinic/appointments" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
