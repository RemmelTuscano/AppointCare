'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stethoscope, User, MapPin, Mail, Lock, Phone, ArrowLeft } from 'lucide-react'

type SignupFormData = {
  username?: string
  clinicName?: string
  email: string
  location: string
  phone: string
  password: string
  confirmPassword: string
}

type SignupSubmit = (event: React.FormEvent<HTMLFormElement>, role: 'patient' | 'clinic', formData: SignupFormData) => void

function digitsOnly(value: string) {
  return `${value.startsWith('+') ? '+' : ''}${value.replace(/\D/g, '')}`
}

export default function SignupPage({ onSwitchToLogin }: { onSwitchToLogin?: () => void } = {}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent, role: 'patient' | 'clinic', formData: SignupFormData) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Add your environment variables to enable signup.')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const phone = normalizePhilippineMobileNumber(formData.phone)
    if (!phone) {
      setError('Enter a Philippine mobile number in the format 09XXXXXXXXX or +639XXXXXXXXX.')
      setLoading(false)
      return
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role,
            full_name: role === 'clinic' ? formData.clinicName : formData.username,
            location: formData.location,
            phone,
            ...(role === 'clinic' ? { clinic_name: formData.clinicName } : {}),
          },
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      router.push('/login?message=Check your email to confirm your account')
    } catch (signupError) {
      console.error('Signup request failed:', signupError)
      const message = signupError instanceof Error ? signupError.message : ''
      setError(
        /failed to fetch|network|fetch failed/i.test(message)
          ? 'Could not connect to the signup service. Check your internet connection and Supabase project settings, then try again.'
          : message || 'We could not create your account. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="mb-4" onClick={() => onSwitchToLogin ? onSwitchToLogin() : router.push('/login')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
      </Button>

      <Card className="border-0 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join AppointCare today</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="patient">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="patient" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Patient
              </TabsTrigger>
              <TabsTrigger value="clinic" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Clinic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patient">
              <PatientSignupForm onSubmit={handleSignup} loading={loading} error={error} />
            </TabsContent>

            <TabsContent value="clinic">
              <ClinicSignupForm onSubmit={handleSignup} loading={loading} error={error} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function PatientSignupForm({ onSubmit, loading, error }: { onSubmit: SignupSubmit; loading: boolean; error: string }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    location: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  return (
    <form onSubmit={(e) => onSubmit(e, 'patient', formData)} className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-2">
        <Label>Username</Label>
        <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} autoComplete="username" required />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input type="email" className="pl-10" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} autoComplete="email" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input className="pl-10" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} autoComplete="address-level1" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="patient-phone">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input id="patient-phone" type="tel" inputMode="tel" pattern="(09[0-9]{9}|[+]639[0-9]{9})" maxLength={13} title="Enter 09XXXXXXXXX or +639XXXXXXXXX." aria-describedby="patient-phone-help" className="pl-10" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: digitsOnly(e.target.value) })} autoComplete="tel" placeholder="09171234567" required />
        </div>
        <p id="patient-phone-help" className="text-xs text-gray-500">Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.</p>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input type="password" className="pl-10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Re-enter Password</Label>
        <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} autoComplete="new-password" required />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating Account...' : 'Sign Up'}
      </Button>
    </form>
  )
}

function ClinicSignupForm({ onSubmit, loading, error }: { onSubmit: SignupSubmit; loading: boolean; error: string }) {
  const [formData, setFormData] = useState({
    clinicName: '',
    email: '',
    location: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  return (
    <form onSubmit={(e) => onSubmit(e, 'clinic', formData)} className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-2">
        <Label>Clinic Name</Label>
        <div className="relative">
          <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input className="pl-10" value={formData.clinicName} onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })} autoComplete="organization" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input type="email" className="pl-10" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} autoComplete="email" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input className="pl-10" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} autoComplete="address-level1" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clinic-phone">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input id="clinic-phone" type="tel" inputMode="tel" pattern="(09[0-9]{9}|[+]639[0-9]{9})" maxLength={13} title="Enter 09XXXXXXXXX or +639XXXXXXXXX." aria-describedby="clinic-phone-help" className="pl-10" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: digitsOnly(e.target.value) })} autoComplete="tel" placeholder="09171234567" required />
        </div>
        <p id="clinic-phone-help" className="text-xs text-gray-500">Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.</p>
      </div>

      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input type="password" className="pl-10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Re-enter Password</Label>
        <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} autoComplete="new-password" required />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating Account...' : 'Register Clinic'}
      </Button>
    </form>
  )
}
