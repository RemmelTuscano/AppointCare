-- Migration: 20231215000001_rename_location_to_address
-- Description: Rename location column to address in profiles table
-- This change aligns the database schema with the updated form fields

BEGIN;

-- Rename location to address in profiles table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN location TO address;
    COMMENT ON COLUMN profiles.address IS 'Physical address of the user';
  ELSE
    RAISE NOTICE 'Column location does not exist in profiles table - skipping rename';
  END IF;
END $$;

COMMIT;
