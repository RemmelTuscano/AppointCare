export type UserRole = 'admin' | 'clinic' | 'patient'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string
  location: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface Clinic {
  id: string
  user_id: string
  name: string
  address: string
  phone: string | null
  email: string | null
  description: string | null
  is_verified: boolean
  created_at: string
}

export interface Doctor {
  id: string
  clinic_id: string
  name: string
  specialization: string | null
  is_available: boolean
  schedule: any
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  clinic_id: string
  doctor_id: string | null
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  created_at: string
  clinic?: Clinic
  doctor?: Doctor
  patient?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: 'email' | 'in_app' | 'sms'
  title: string
  message: string
  is_read: boolean
  metadata: any
  created_at: string
}