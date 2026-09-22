'use client'

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ShieldCheck, Stethoscope, User, Mail, Lock, Globe } from 'lucide-react'

type LoginRole = 'patient' | 'clinic' | 'admin'

export default function LoginPage({ onSwitchToSignup }: { onSwitchToSignup?: () => void } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState<LoginRole>('patient')
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
        const userRole = profile?.role || (metadataRole === 'admin' || metadataRole === 'clinic' || metadataRole === 'patient' ? metadataRole : null)

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

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="mb-4 inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#27684e] transition hover:bg-[#dff0df] hover:text-[#174c40]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </button>
      <Card className="border border-[#c8dfca] bg-[#fafffa] shadow-[0_24px_70px_rgba(23,76,64,0.16)]">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-xl bg-[#174c40] p-3 shadow-lg shadow-[#174c40]/20">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-[#174c40]">AppointCare</CardTitle>
        <CardDescription className="text-[#587269]">Sign in to manage your appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          role={role}
          onRoleChange={setRole}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          error={error}
          onSubmit={handleLogin}
          onGoogleLogin={handleGoogleLogin}
        />

        <div className="mt-6 flex justify-center text-sm text-gray-600">
          <div>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onSwitchToSignup ? onSwitchToSignup() : router.push('/signup')}
              className="font-medium text-[#27684e] hover:text-[#174c40] hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}

type LoginFormProps = {
  role: LoginRole
  onRoleChange: (role: LoginRole) => void
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  loading: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onGoogleLogin: () => void
}

function LoginForm({ role, onRoleChange, email, setEmail, password, setPassword, loading, error, onSubmit, onGoogleLogin }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="login-role">Sign in as</Label>
        <div className="relative">
          <select
            id="login-role"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as LoginRole)}
            className="flex h-10 w-full appearance-none rounded-md border border-[#c8dfca] bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9a6d] focus-visible:ring-offset-2"
          >
            <option value="patient">Patient</option>
            <option value="clinic">Clinic</option>
            <option value="admin">Administrator</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#587269]">
            {role === 'patient' && <User className="h-4 w-4" />}
            {role === 'clinic' && <Stethoscope className="h-4 w-4" />}
            {role === 'admin' && <ShieldCheck className="h-4 w-4" />}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-[#587269]" />
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
          <Lock className="absolute left-3 top-3 h-4 w-4 text-[#587269]" />
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

      <Button type="submit" className="w-full bg-[#27684e] text-white hover:bg-[#174c40]" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#d8e8da]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#fafffa] px-2 text-[#587269]">Or continue with</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full border-[#c8dfca] text-[#27684e] hover:bg-[#eaf5e9]" onClick={onGoogleLogin}>
        <Globe className="mr-2 h-4 w-4" />
        Google
      </Button>
    </form>
  )
}
