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
  Shield
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
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-emerald-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <span className="text-lg font-bold text-emerald-800">AppointCare</span>
        <Button variant="ghost" size="icon" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-emerald-900/30 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="border-b border-white/10 p-6">
          <h1 className="text-2xl font-bold tracking-normal text-white">AppointCare</h1>
          <p className="mt-1 text-sm capitalize text-emerald-100/70">{activeRole} portal</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-emerald-100 text-emerald-950 shadow-sm" 
                    : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 px-4">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs capitalize text-emerald-100/65">{activeRole}</p>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 border-white/15 bg-white/5 text-emerald-50 hover:border-white/25 hover:bg-white/10 hover:text-white"
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