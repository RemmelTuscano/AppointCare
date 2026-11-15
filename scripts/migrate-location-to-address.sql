-- Migration: Rename location to address in profiles table
-- Description: Updates the profiles table to use 'address' instead of 'location'
-- This change makes the naming consistent across all user signup forms

BEGIN;

-- Check if location column exists before attempting to rename
-- If the column doesn't exist, the migration will be a no-op
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    -- Rename location to address
    ALTER TABLE profiles RENAME COLUMN location TO address;
    
    -- Add comment for documentation
    COMMENT ON COLUMN profiles.address IS 'Physical address of the user (patient) or clinic';
  END IF;
END $$;

COMMIT;
