'use client'

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandMark } from '@/components/ui/brand-mark'
import { ArrowLeft, ShieldCheck, Stethoscope, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'

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
        redirectTo: `${getSiteUrl()}/auth/callback?role=${encodeURIComponent(role)}`,
      },
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="mb-4 inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs sm:text-sm font-medium text-[#27684e] transition hover:bg-[#dff0df] hover:text-[#174c40]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to home</span>
        <span className="sm:hidden">Back</span>
      </button>
      <Card className="border border-[#c8dfca] bg-[#fafffa] shadow-[0_24px_70px_rgba(23,76,64,0.16)]">
      <CardHeader className="space-y-1 text-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex justify-center">
          <BrandMark className="size-10 rounded-[27%] shadow-lg shadow-[#174c40]/20 sm:size-14" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-[#174c40]">AppointCare</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[#587269]">Sign in to manage your appointments</CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-6 sm:px-6 sm:py-8">
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

        <div className="mt-6 flex justify-center text-xs sm:text-sm text-gray-600">
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
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="login-role" className="text-xs sm:text-sm">Sign in as</Label>
        <div className="relative">
          <select
            id="login-role"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as LoginRole)}
            className="flex h-10 w-full appearance-none rounded-md border border-[#c8dfca] bg-white px-3 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9a6d] focus-visible:ring-offset-2"
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
        <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-[#587269]" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 text-xs sm:text-sm"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-[#587269]" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 text-xs sm:text-sm"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[#587269] transition hover:text-[#174c40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4f9a6d]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full h-10 sm:h-11 bg-[#27684e] text-xs sm:text-sm text-white hover:bg-[#174c40]" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-3 sm:my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#d8e8da]" />
        </div>
        <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
          <span className="bg-[#fafffa] px-2 text-[#587269]">Or continue with</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full h-10 sm:h-11 border-[#c8dfca] text-xs sm:text-sm text-[#27684e] hover:bg-[#eaf5e9]" onClick={onGoogleLogin}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="hidden sm:inline">Google</span>
      </Button>
    </form>
  )
}
