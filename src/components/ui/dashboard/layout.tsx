import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/ui/dashboard/sidebar'
import { AIAssistant } from '@/components/ui/ai-assistant'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  if (!supabase) {
    redirect('/login')
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let profile = null
  const metadataRole = user.user_metadata.role
  let role = metadataRole === 'admin' || metadataRole === 'clinic' || metadataRole === 'patient' ? metadataRole : 'patient'

  // The profile is preferred, while Auth metadata keeps the dashboard available during RLS repairs.
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      profile = profileData
      role = profileData.role || 'patient'
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch profile (RLS may be blocking):', err)
    // Continue with default patient role
  }

  return (
    <div className="min-h-screen text-foreground lg:flex">
      <Sidebar role={role} userName={profile?.full_name || user.email || 'User'} />
      <main className="min-w-0 flex-1 overflow-auto px-4 pb-8 pt-20 sm:px-6 sm:pb-10 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="mb-8 flex items-center justify-between border-b border-border/70 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">AppointCare <span className="px-1.5 text-primary/45">/</span> {role} workspace</p>
              <p className="mt-1 text-sm text-foreground/75">A clear view of the care in motion.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
                <span className="size-2 rounded-full bg-emerald-500" /> Workspace active
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground" aria-label={profile?.full_name || user.email || 'User'}>
                {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          {children}
        </div>
      </main>
      {role !== 'admin' && <AIAssistant />}
    </div>
  )
}