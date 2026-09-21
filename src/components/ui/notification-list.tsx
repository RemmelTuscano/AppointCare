'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Hash, Mail, MessageSquare } from 'lucide-react'
import { formatScheduleId } from '@/lib/email-templates'

export type AppNotification = {
  id: string
  type: 'email' | 'in_app' | 'sms'
  title: string
  message: string
  is_read: boolean
  created_at: string
  metadata: { appointment_id?: string; schedule_id?: string; event?: string } | null
}

type NotificationListProps = {
  notifications: AppNotification[]
  appointmentPath: string
}

export function NotificationList({ notifications: initialNotifications, appointmentPath }: NotificationListProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()
  const supabase = createClient()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-emerald-600" />
      case 'sms':
        return <MessageSquare className="h-5 w-5 text-teal-600" />
      default:
        return <Bell className="h-5 w-5 text-emerald-700" />
    }
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)

      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
    }

    router.push(appointmentPath)
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })))
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <Bell className="mx-auto mb-3 h-12 w-12 text-emerald-200" />
        <p className="text-muted-foreground font-medium">No notifications yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Automated email and SMS updates will be recorded here when appointments are created, confirmed, or rescheduled.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className="text-xs h-8"
          >
            All ({notifications.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'unread' ? 'default' : 'ghost'}
            onClick={() => setFilter('unread')}
            className="text-xs h-8"
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllAsRead} className="text-xs h-8">
            <CheckCheck className="mr-1.5 size-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((notification) => {
          const scheduleId = notification.metadata?.schedule_id || (notification.metadata?.appointment_id ? formatScheduleId(notification.metadata.appointment_id) : null)

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleNotificationClick(notification)}
              className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all hover:bg-emerald-50/70 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                notification.is_read
                  ? 'border-slate-200 bg-white'
                  : 'border-emerald-300 bg-emerald-50/60 shadow-xs'
              }`}
            >
              <div className="mt-1 shrink-0">{getNotificationIcon(notification.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-emerald-950 text-sm">{notification.title}</h4>
                  
                  {scheduleId && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                      <Hash className="size-3" />
                      {scheduleId}
                    </span>
                  )}

                  {!notification.is_read && (
                    <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">New</Badge>
                  )}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{notification.message}</p>
                
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                  <span className="capitalize text-emerald-700 font-medium">Channel: {notification.type === 'sms' ? 'SMS' : notification.type === 'email' ? 'Email' : 'In-App / Automated'}</span>
                </div>
              </div>
              {!notification.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-emerald-600" aria-label="Unread" />}
            </button>
          )
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No unread notifications.</p>
        )}
      </div>
    </div>
  )
}