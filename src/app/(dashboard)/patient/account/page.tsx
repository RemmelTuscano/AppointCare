import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/components/ui/change-password-dialog'
import { DeleteAccountDialog } from '@/components/ui/delete-account-dialog'
import { KeyRound, MapPin, UserRound, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const MEDICAL_SPECIALTIES = [
  'General Practice',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Dentistry'
]

async function updateNotificationPreferences(formData: FormData) {
  'use server'

  const supabase = await createClient()
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const smsEnabled = formData.get('smsEnabled') === 'on'
  const emailEnabled = formData.get('emailEnabled') === 'on'
  const notificationPreferences = { email: emailEnabled, sms: smsEnabled }
  await supabase.auth.updateUser({ data: { notification_preferences: notificationPreferences } })
  const { error } = await supabase.from('profiles').update({ notification_preferences: notificationPreferences, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id)
  revalidatePath('/patient/account')
}

export default async function AccountPage() {
  const supabase = await createClient()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) {
    console.error('Could not fetch profile:', error)
    throw new Error('Could not load your profile. Please try again.')
  }
  const preferences = profile?.notification_preferences || user?.user_metadata?.notification_preferences || { email: true, sms: true }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-emerald-700">Your profile</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">Account & preferences</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review your personal information, security, and communication choices.</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><UserRound className="size-5 text-emerald-700" />Profile information</CardTitle>
            <CardDescription>Your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full name</p>
                <p className="text-lg text-emerald-950">{profile?.full_name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="break-all text-lg text-emerald-950">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-lg text-emerald-950">{profile?.address || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-lg text-emerald-950">{profile?.phone || 'Not set'}</p>
              </div>
            </div>
            <Button asChild className="mt-4"><Link href="/patient/account/edit">Edit Profile</Link></Button>
          </CardContent>
        </Card>

        {/* Appointment Notes & Specialty Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><Stethoscope className="size-5 text-emerald-700" />Appointment Information</CardTitle>
            <CardDescription>Specify your medical specialty needs and add notes for your appointment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preferred Specialty</p>
                <p className="text-lg text-emerald-950">{profile?.preferred_specialty || 'Not selected'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Appointment Notes</p>
                <p className="text-base text-emerald-950 whitespace-pre-wrap">{profile?.appointment_notes || 'No notes added'}</p>
              </div>
            </div>
            <Button asChild className="mt-4"><Link href="/patient/account/edit">Edit Appointment Info</Link></Button>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><KeyRound className="size-5 text-emerald-700" />Security</CardTitle>
            <CardDescription>Manage your password and authentication methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Password</p>
              <ChangePasswordDialog />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-950"><MapPin className="size-5 text-emerald-700" />Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateNotificationPreferences} className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/35 p-4">
                <div>
                  <p className="font-medium text-emerald-950">Email notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates about your appointments</p>
                </div>
                <input type="checkbox" name="emailEnabled" defaultChecked={preferences.email !== false} className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/35 p-4">
                <div>
                  <p className="font-medium text-emerald-950">SMS notifications</p>
                  <p className="text-sm text-muted-foreground">Receive appointment reminders and status updates by text message</p>
                </div>
                <input type="checkbox" name="smsEnabled" defaultChecked={preferences.sms !== false} className="h-4 w-4" />
              </div>
              <div className="flex justify-end pt-2"><Button type="submit">Save notification preferences</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Delete account</CardTitle>
            <CardDescription>Permanently remove your account and all associated data</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
