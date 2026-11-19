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
  Shield,
  Activity,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/ui/brand-mark'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: 'admin' | 'clinic' | 'patient'
  userName: string
}

const navigation = {
  clinic: [
    { name: 'Dashboard', href: '/clinic/dashboard', icon: LayoutDashboard },
    { name: 'Appointments', href: '/clinic/appointments', icon: Calendar },
    { name: 'Clinic', href: '/clinic/doctors', icon: Building2 },
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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 z-50 lg:flex h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl lg:sticky">
        <div className="border-b border-sidebar-border/70 px-5 py-6">
          <Link href={`/${activeRole}/dashboard`} className="flex items-center gap-3" aria-label="AppointCare dashboard">
            <BrandMark className="size-10 shrink-0 rounded-[27%] shadow-sm ring-1 ring-white/20" />
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
            onClick={() => setLogoutDialogOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <header className="border-b border-border bg-background px-4 py-3 lg:hidden">
        <Link href={`/${activeRole}/dashboard`} className="inline-flex items-center gap-2 font-heading text-lg font-semibold text-emerald-950" aria-label="AppointCare dashboard">
          <BrandMark className="size-9 shrink-0" />
          AppointCare
        </Link>
      </header>

      {/* Mobile Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-around gap-2 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 px-3 py-3 shadow-2xl backdrop-blur-xl lg:hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300 hover:opacity-100" />
        
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 transition-all duration-300 hover:bg-white/10",
                isActive
                  ? "text-primary drop-shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:scale-110"
              )}
              aria-label={item.name}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-primary/10 -z-10 animate-pulse" />
              )}
              <item.icon className={cn(
                "size-5 transition-all duration-300",
                isActive ? "scale-125 drop-shadow-lg" : "scale-100"
              )} />
              <span className="truncate max-w-[50px] text-[9px] font-semibold">{item.name}</span>
            </Link>
          )
        })}
        
        <div className="h-6 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
        
        <button
          onClick={() => setLogoutDialogOpen(true)}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 transition-all duration-300 hover:bg-white/10",
            "text-muted-foreground hover:text-foreground hover:scale-110"
          )}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="size-5 transition-all duration-300" />
          <span className="truncate max-w-[50px] text-[9px] font-semibold">Logout</span>
        </button>
      </nav>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
          <DialogHeader>
            <DialogTitle id="logout-dialog-title">Log out?</DialogTitle>
            <DialogDescription>Are you sure you want to log out of your account?</DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}