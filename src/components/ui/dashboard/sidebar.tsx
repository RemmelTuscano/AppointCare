'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  Calendar, 
  Bell, 
  Users, 
  Stethoscope, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: 'admin' | 'clinic' | 'patient'
  userName: string
}

const navigation = {
  clinic: [
    { name: 'Dashboard', href: '/clinic/dashboard', icon: LayoutDashboard },
    { name: 'Appointments', href: '/clinic/appointments', icon: Calendar },
    { name: 'Doctors', href: '/clinic/doctors', icon: Users },
    { name: 'Notifications', href: '/clinic/notifications', icon: Bell },
    { name: 'Account', href: '/clinic/account', icon: Settings },
  ],
  patient: [
    { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Appointments', href: '/patient/appointments', icon: Calendar },
    { name: 'Clinics', href: '/patient/clinics', icon: Stethoscope },
    { name: 'Notifications', href: '/patient/notifications', icon: Bell },
    { name: 'Account', href: '/patient/account', icon: Settings },
  ],
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Clinics', href: '/admin/clinics', icon: Stethoscope },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Activity', href: '/admin/activity', icon: Activity },
    { name: 'Backup', href: '/admin/backup', icon: Shield },
  ],
}

export function Sidebar({ role, userName }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const routeRole = pathname?.split('/')[1]
  const activeRole = routeRole === 'clinic' || routeRole === 'patient' || routeRole === 'admin' ? routeRole : role
  const items = navigation[activeRole]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <span className="inline-flex items-center gap-2 font-heading text-lg font-semibold text-foreground"><HeartPulse className="size-5 text-primary" />AppointCare</span>
        <Button variant="ghost" size="icon" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:sticky",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="border-b border-sidebar-border/70 px-5 py-6">
          <Link href={`/${activeRole}/dashboard`} className="flex items-center gap-3" aria-label="AppointCare dashboard">
            <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"><HeartPulse className="size-5" strokeWidth={2.5} /></span>
            <span>
              <span className="block font-heading text-xl font-semibold text-white">AppointCare</span>
              <span className="mt-0.5 block text-[11px] font-bold uppercase text-sidebar-foreground/55">{activeRole} workspace</span>
            </span>
          </Link>
        </div>

        <div className="px-5 pb-2 pt-7 text-[10px] font-bold uppercase text-sidebar-foreground/40">Workspace</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-sidebar-primary/20 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:border-white/5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-[18px] opacity-85 transition-transform group-hover:scale-105" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border/70 p-4">
          <div className="mb-4 flex min-w-0 items-center gap-3 px-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground">{userName.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs capitalize text-sidebar-foreground/55">{activeRole}</p>
            </div>
          </div>
          <Button 
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  )
}