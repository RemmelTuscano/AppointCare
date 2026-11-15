-- Migration: 20261115234000_add_patient_notes_and_specialty
-- Description: Add notes and specialty/department dropdown fields for patient appointments
-- This allows patients to add notes and specify which medical specialty they need

BEGIN;

-- Add notes and specialty columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS appointment_notes TEXT,
ADD COLUMN IF NOT EXISTS preferred_specialty VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.appointment_notes IS 'Notes from the patient about their appointment or medical needs';
COMMENT ON COLUMN public.profiles.preferred_specialty IS 'Preferred medical specialty (General Practice, Pediatrics, Obstetrics & Gynecology, Cardiology, Dermatology, Orthopedics, Dentistry)';

-- Create a check constraint for valid specialties
ALTER TABLE public.profiles
ADD CONSTRAINT valid_specialty CHECK (
  preferred_specialty IS NULL OR preferred_specialty IN (
    'General Practice',
    'Pediatrics',
    'Obstetrics & Gynecology',
    'Cardiology',
    'Dermatology',
    'Orthopedics',
    'Dentistry'
  )
);

COMMIT;
