import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/ui/dashboard/sidebar'

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
  let role = metadataRole === 'clinic' || metadataRole === 'patient' ? metadataRole : 'patient'

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(187,247,208,0.55),transparent_30%),var(--background)] text-foreground lg:flex">
      <Sidebar role={role} userName={profile?.full_name || user.email || 'User'} />
      <main className="min-w-0 flex-1 overflow-auto p-4 pt-20 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}