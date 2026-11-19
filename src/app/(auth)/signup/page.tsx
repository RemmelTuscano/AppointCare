'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'
import { normalizePhilippineMobileNumber } from '@/lib/phone'
import { SIGNUP_ADDRESS_SUGGESTIONS } from '@/lib/signup-addresses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Stethoscope, User, MapPin, Mail, Lock, Phone, ArrowLeft, AlertCircle, Check } from 'lucide-react'

type SignupFormData = {
  fullname?: string
  clinicName?: string
  email: string
  address: string
  phone: string
  password: string
  confirmPassword: string
}

type SignupSubmit = (event: React.FormEvent<HTMLFormElement>, role: 'patient' | 'clinic', formData: SignupFormData) => void

function digitsOnly(value: string) {
  return `${value.startsWith('+') ? '+' : ''}${value.replace(/\D/g, '')}`
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@gmail\.com$/.test(email.toLowerCase())
}

function calculatePasswordStrength(password: string): 'weak' | 'fair' | 'good' | 'strong' {
  if (password.length < 6) return 'weak'
  if (password.length < 8) return 'fair'
  if (password.length < 12) return 'good'
  if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)) return 'strong'
  return 'good'
}

function getPasswordStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500'
    case 'fair':
      return 'bg-orange-500'
    case 'good':
      return 'bg-blue-500'
    case 'strong':
      return 'bg-green-500'
  }
}

export default function SignupPage({ onSwitchToLogin }: { onSwitchToLogin?: () => void } = {}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const addressListId = useId()

  const handleSignup = async (e: React.FormEvent, role: 'patient' | 'clinic', formData: SignupFormData) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Add your environment variables to enable signup.')
      setLoading(false)
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please use a @gmail.com email address')
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
            full_name: role === 'clinic' ? formData.clinicName : formData.fullname,
            address: formData.address,
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
      <Button variant="ghost" className="mb-4 text-xs sm:text-sm h-9 sm:h-10" onClick={() => onSwitchToLogin ? onSwitchToLogin() : router.push('/login')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
      </Button>

      <Card className="border-0 shadow-2xl">
        <CardHeader className="text-center px-4 py-6 sm:px-6 sm:py-8">
          <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Join AppointCare today</CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6 sm:py-8">
          <Tabs defaultValue="patient">
            <TabsList className="mb-6 grid w-full grid-cols-2 h-10 text-xs sm:text-sm">
              <TabsTrigger value="patient" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <User className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Patient</span><span className="sm:hidden">Patient</span>
              </TabsTrigger>
              <TabsTrigger value="clinic" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Clinic</span><span className="sm:hidden">Clinic</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patient">
              <PatientSignupForm onSubmit={handleSignup} loading={loading} error={error} addressListId={addressListId} />
            </TabsContent>

            <TabsContent value="clinic">
              <ClinicSignupForm onSubmit={handleSignup} loading={loading} error={error} addressListId={addressListId} />
            </TabsContent>
          </Tabs>
          <datalist id={addressListId}>
            {SIGNUP_ADDRESS_SUGGESTIONS.map((address) => <option key={address} value={address} />)}
          </datalist>
        </CardContent>
      </Card>
    </div>
  )
}

function PatientSignupForm({ onSubmit, loading, error, addressListId }: { onSubmit: SignupSubmit; loading: boolean; error: string; addressListId: string }) {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    address: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const passwordStrength = calculatePasswordStrength(formData.password)

  const validateField = (name: string, value: string) => {
    const newErrors = { ...validationErrors }

    switch (name) {
      case 'fullname':
        if (!value.trim()) {
          newErrors.fullname = 'Fullname is required'
        } else if (value.trim().length < 2) {
          newErrors.fullname = 'Fullname must be at least 2 characters'
        } else {
          delete newErrors.fullname
        }
        break
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required'
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please use a @gmail.com email address'
        } else {
          delete newErrors.email
        }
        break
      case 'address':
        if (!value.trim()) {
          newErrors.address = 'Address is required'
        } else if (value.trim().length < 5) {
          newErrors.address = 'Please enter a valid address'
        } else {
          delete newErrors.address
        }
        break
      case 'phone':
        if (!value) {
          newErrors.phone = 'Phone number is required'
        } else if (!/^(09|[+]639)[0-9]{9}$/.test(digitsOnly(value))) {
          newErrors.phone = 'Enter a valid Philippine mobile number'
        } else {
          delete newErrors.phone
        }
        break
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required'
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters'
        } else {
          delete newErrors.password
        }
        break
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password'
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match'
        } else {
          delete newErrors.confirmPassword
        }
        break
    }

    setValidationErrors(newErrors)
  }

  const handleFieldChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
    validateField(name, value)
  }

  return (
    <form onSubmit={(e) => onSubmit(e, 'patient', formData)} className="space-y-3 sm:space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-600 flex items-center gap-2"><AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /><span>{error}</span></div>}

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Fullname</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.fullname ? 'border-red-500' : ''}`}
            value={formData.fullname}
            onChange={(e) => handleFieldChange('fullname', e.target.value)}
            autoComplete="name"
            placeholder="Your full name"
            required
          />
        </div>
        {validationErrors.fullname && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.fullname}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.email ? 'border-red-500' : ''}`}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            autoComplete="email"
            placeholder="your@gmail.com"
            required
          />
        </div>
        {validationErrors.email && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.email}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor={`${addressListId}-patient-address`} className="text-xs sm:text-sm">Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id={`${addressListId}-patient-address`}
            list={addressListId}
            aria-describedby={`${addressListId}-patient-address-help`}
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.address ? 'border-red-500' : ''}`}
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            autoComplete="street-address"
            placeholder="Your address"
            required
          />
        </div>
        <p id={`${addressListId}-patient-address-help`} className="text-[10px] sm:text-xs text-gray-500">Choose a suggested location or type your full address.</p>
        {validationErrors.address && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.address}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="patient-phone" className="text-xs sm:text-sm">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="patient-phone"
            type="tel"
            inputMode="tel"
            pattern="(09[0-9]{9}|[+]639[0-9]{9})"
            maxLength={13}
            title="Enter 09XXXXXXXXX or +639XXXXXXXXX."
            aria-describedby="patient-phone-help"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.phone ? 'border-red-500' : ''}`}
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', digitsOnly(e.target.value))}
            autoComplete="tel"
            placeholder="09171234567"
            required
          />
        </div>
        {validationErrors.phone && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.phone}</p>}
        <p id="patient-phone-help" className="text-[10px] sm:text-xs text-gray-500">Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.</p>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="password"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.password ? 'border-red-500' : ''}`}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            autoComplete="new-password"
            placeholder="••••••"
            required
          />
        </div>
        {formData.password && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className={`h-2 flex-1 rounded-full ${getPasswordStrengthColor(passwordStrength)}`}></div>
              <span className="capitalize text-gray-600">{passwordStrength}</span>
            </div>
          </div>
        )}
        {validationErrors.password && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{validationErrors.password}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Confirm Password</Label>
        <Input
          type="password"
          className={`text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
          value={formData.confirmPassword}
          onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••"
          required
        />
        {validationErrors.confirmPassword && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.confirmPassword}</p>}
      </div>

      <Button type="submit" className="w-full h-9 sm:h-10 text-xs sm:text-sm" disabled={loading || Object.keys(validationErrors).length > 0}>
        {loading ? 'Creating Account...' : 'Sign Up'}
      </Button>
    </form>
  )
}

function ClinicSignupForm({ onSubmit, loading, error, addressListId }: { onSubmit: SignupSubmit; loading: boolean; error: string; addressListId: string }) {
  const [formData, setFormData] = useState({
    clinicName: '',
    email: '',
    address: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const passwordStrength = calculatePasswordStrength(formData.password)

  const validateField = (name: string, value: string) => {
    const newErrors = { ...validationErrors }

    switch (name) {
      case 'clinicName':
        if (!value.trim()) {
          newErrors.clinicName = 'Clinic name is required'
        } else if (value.trim().length < 2) {
          newErrors.clinicName = 'Clinic name must be at least 2 characters'
        } else {
          delete newErrors.clinicName
        }
        break
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required'
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please use a @gmail.com email address'
        } else {
          delete newErrors.email
        }
        break
      case 'address':
        if (!value.trim()) {
          newErrors.address = 'Address is required'
        } else if (value.trim().length < 5) {
          newErrors.address = 'Please enter a valid address'
        } else {
          delete newErrors.address
        }
        break
      case 'phone':
        if (!value) {
          newErrors.phone = 'Phone number is required'
        } else if (!/^(09|[+]639)[0-9]{9}$/.test(digitsOnly(value))) {
          newErrors.phone = 'Enter a valid Philippine mobile number'
        } else {
          delete newErrors.phone
        }
        break
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required'
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters'
        } else {
          delete newErrors.password
        }
        break
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password'
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match'
        } else {
          delete newErrors.confirmPassword
        }
        break
    }

    setValidationErrors(newErrors)
  }

  const handleFieldChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
    validateField(name, value)
  }

  return (
    <form onSubmit={(e) => onSubmit(e, 'clinic', formData)} className="space-y-3 sm:space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-2 sm:p-3 text-xs sm:text-sm text-red-600 flex items-center gap-2"><AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /><span>{error}</span></div>}

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Clinic Name</Label>
        <div className="relative">
          <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.clinicName ? 'border-red-500' : ''}`}
            value={formData.clinicName}
            onChange={(e) => handleFieldChange('clinicName', e.target.value)}
            autoComplete="organization"
            placeholder="Your clinic name"
            required
          />
        </div>
        {validationErrors.clinicName && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.clinicName}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.email ? 'border-red-500' : ''}`}
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            autoComplete="email"
            placeholder="clinic@gmail.com"
            required
          />
        </div>
        {validationErrors.email && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.email}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor={`${addressListId}-clinic-address`} className="text-xs sm:text-sm">Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id={`${addressListId}-clinic-address`}
            list={addressListId}
            aria-describedby={`${addressListId}-clinic-address-help`}
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.address ? 'border-red-500' : ''}`}
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            autoComplete="street-address"
            placeholder="Clinic address"
            required
          />
        </div>
        <p id={`${addressListId}-clinic-address-help`} className="text-[10px] sm:text-xs text-gray-500">Choose a suggested location or type your full address.</p>
        {validationErrors.address && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.address}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="clinic-phone" className="text-xs sm:text-sm">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="clinic-phone"
            type="tel"
            inputMode="tel"
            pattern="(09[0-9]{9}|[+]639[0-9]{9})"
            maxLength={13}
            title="Enter 09XXXXXXXXX or +639XXXXXXXXX."
            aria-describedby="clinic-phone-help"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.phone ? 'border-red-500' : ''}`}
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', digitsOnly(e.target.value))}
            autoComplete="tel"
            placeholder="09171234567"
            required
          />
        </div>
        {validationErrors.phone && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.phone}</p>}
        <p id="clinic-phone-help" className="text-[10px] sm:text-xs text-gray-500">Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.</p>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="password"
            className={`pl-10 text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.password ? 'border-red-500' : ''}`}
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            autoComplete="new-password"
            placeholder="••••••"
            required
          />
        </div>
        {formData.password && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
              <div className={`h-2 flex-1 rounded-full ${getPasswordStrengthColor(passwordStrength)}`}></div>
              <span className="capitalize text-gray-600">{passwordStrength}</span>
            </div>
          </div>
        )}
        {validationErrors.password && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.password}</p>}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Confirm Password</Label>
        <Input
          type="password"
          className={`text-xs sm:text-sm h-9 sm:h-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
          value={formData.confirmPassword}
          onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
          autoComplete="new-password"
          placeholder="••••••"
          required
        />
        {validationErrors.confirmPassword && <p className="text-[10px] sm:text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{validationErrors.confirmPassword}</p>}
      </div>

      <Button type="submit" className="w-full h-9 sm:h-10 text-xs sm:text-sm" disabled={loading || Object.keys(validationErrors).length > 0}>
        {loading ? 'Creating Account...' : 'Register Clinic'}
      </Button>
    </form>
  )
}
