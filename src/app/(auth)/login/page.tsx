'use client'

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stethoscope, User, Mail, Lock, Globe } from 'lucide-react'

const PRESET_PATIENT_ACCOUNT = {
  email: 'patient@appointcare.test',
  password: 'Patient@12345',
}

const PRESET_CLINIC_ACCOUNT = {
  email: 'clinic@appointcare.test',
  password: 'Clinic@12345',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState<'patient' | 'clinic'>('patient')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const messageTimeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const redirectError = params.get('error')
      const redirectMessage = params.get('message')
      if (redirectError) setError(redirectError)
      if (redirectMessage) setError(redirectMessage)
    }, 0)

    return () => window.clearTimeout(messageTimeout)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Add your environment variables to enable login.')
      setLoading(false)
      return
    }

    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const metadataRole = data.user.user_metadata.role
        const userRole = profile?.role || (metadataRole === 'clinic' || metadataRole === 'patient' ? metadataRole : null)

        if (!userRole) {
          await supabase.auth.signOut()
          setError('We could not verify your account type. Please try again.')
          setLoading(false)
          return
        }

        if (userRole !== role) {
          await supabase.auth.signOut()
          setError(`This account is registered as a ${userRole}. Please use the ${userRole} sign-in tab.`)
          setLoading(false)
          return
        }

        router.replace(`/${userRole}/dashboard`)
        router.refresh()
      }
    } catch (err: unknown) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Please try again.'}`)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Add your environment variables to enable Google sign in.')
      return
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?role=${encodeURIComponent(role)}`,
      },
    })
  }

  const handleUsePresetPatientAccount = () => {
    setRole('patient')
    setEmail(PRESET_PATIENT_ACCOUNT.email)
    setPassword(PRESET_PATIENT_ACCOUNT.password)
    setError('')
  }

  const handleUsePresetClinicAccount = () => {
    setRole('clinic')
    setEmail(PRESET_CLINIC_ACCOUNT.email)
    setPassword(PRESET_CLINIC_ACCOUNT.password)
    setError('')
  }

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-xl bg-blue-600 p-3">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">AppointCare</CardTitle>
        <CardDescription>Sign in to manage your appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patient" className="w-full" onValueChange={(v) => setRole(v as 'patient' | 'clinic')}>
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="patient" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Patient
            </TabsTrigger>
            <TabsTrigger value="clinic" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Clinic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patient">
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              loading={loading}
              error={error}
              onSubmit={handleLogin}
              onGoogleLogin={handleGoogleLogin}
            />
          </TabsContent>

          <TabsContent value="clinic">
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              loading={loading}
              error={error}
              onSubmit={handleLogin}
              onGoogleLogin={handleGoogleLogin}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={handleUsePresetPatientAccount}
            className="font-medium text-blue-600 hover:underline"
          >
            Use preset patient account
          </button>
          <button
            type="button"
            onClick={handleUsePresetClinicAccount}
            className="font-medium text-blue-600 hover:underline"
          >
            Use preset clinic account
          </button>
          <div>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="font-medium text-blue-600 hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type LoginFormProps = {
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  loading: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onGoogleLogin: () => void
}

function LoginForm({ email, setEmail, password, setPassword, loading, error, onSubmit, onGoogleLogin }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin}>
        <Globe className="mr-2 h-4 w-4" />
        Google
      </Button>
    </form>
  )
}
