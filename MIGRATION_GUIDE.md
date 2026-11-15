# Database Migration Setup Guide

## Overview
This guide explains how to set up and run database migrations for AppointCare.

## Quick Start

### 1. Set Up Environment Variables
Add these to your `.env.local` file:

```env
# Required for migrations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For admin operations (recommended)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Create the Schema Migrations Table

Before running migrations, you need to create the tracking table in your Supabase database.

Open your **Supabase SQL Editor** and run:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Run Migrations

```bash
# Run all pending migrations
npm run migrate

# List all available migrations
npm run migrate:list

# Show help
npm run migrate:help
```

## Available Commands

### Run Migrations
```bash
npm run migrate
```
Executes all pending migrations and records them in the `schema_migrations` table.

**Output Example:**
```
🔄 Running 1 pending migration(s)...

ℹ Executing: 20231215000001_rename_location_to_address.sql
✓ 20231215000001_rename_location_to_address.sql

✓ Migration complete: 1/1 successful
```

### List Migrations
```bash
npm run migrate:list
```
Shows all available migrations and their execution status.

**Output Example:**
```
📋 Available Migrations:

Status | Migration Name
-------|---------------------------
  ✓   | 20231215000001_rename_location_to_address.sql
   
```

### Show Help
```bash
npm run migrate:help
```
Displays detailed help information about migrations.

## Creating New Migrations

### Step 1: Create Migration File
Create a new SQL file in `scripts/migrations/` with the naming convention:

```
YYYYMMDDHHMMSS_description.sql
```

**Example:** `20240101120000_add_clinic_status.sql`

### Step 2: Write Your Migration

```sql
-- Migration: 20240101120000_add_clinic_status
-- Description: Add status column to clinics table

BEGIN;

-- Add status column
ALTER TABLE clinics 
ADD COLUMN status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'active', 'inactive'));

-- Add comment
COMMENT ON COLUMN clinics.status IS 'Clinic verification status';

COMMIT;
```

### Step 3: Run Migration
```bash
npm run migrate
```

## Migration Best Practices

### ✓ DO:
- ✓ Use `BEGIN;` and `COMMIT;` for transactions
- ✓ Use `DO $$ ... $$` blocks for conditional logic
- ✓ Check if columns/tables exist before modifying
- ✓ Add comments to document schema changes
- ✓ Use descriptive migration names
- ✓ Keep migrations small and focused
- ✓ Test migrations in development first

### ✗ DON'T:
- ✗ Drop tables without careful consideration
- ✗ Delete data without backup
- ✗ Create migrations without testing
- ✗ Use non-idempotent operations
- ✗ Make breaking changes without migration path

## Example Migrations

### Add a Column
```sql
BEGIN;

ALTER TABLE profiles 
ADD COLUMN verified_at TIMESTAMP NULL;

COMMIT;
```

### Add a Constraint
```sql
BEGIN;

ALTER TABLE clinics 
ADD CONSTRAINT unique_clinic_email UNIQUE(email);

COMMIT;
```

### Create an Index
```sql
BEGIN;

CREATE INDEX idx_appointments_clinic_id 
ON appointments(clinic_id);

CREATE INDEX idx_appointments_status 
ON appointments(status);

COMMIT;
```

### Add a Table
```sql
BEGIN;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

COMMIT;
```

### Conditional Migration (Safe to Re-run)
```sql
BEGIN;

DO $$ 
BEGIN
  -- Only add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'insurance_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN insurance_id TEXT;
  END IF;
END $$;

COMMIT;
```

## Troubleshooting

### Error: "schema_migrations table does not exist"
**Solution:** Run the SQL to create the table first (see Step 2 above)

### Error: "SUPABASE_URL is not set"
**Solution:** Add environment variables to `.env.local`

### Error: "Failed to execute migration"
**Solution:** 
1. Check the SQL syntax in your migration file
2. Test the SQL directly in Supabase SQL Editor
3. Review the error message for specific issues

### Migration Ran But Didn't Record
**Solution:** This can happen if:
- The `schema_migrations` table doesn't exist
- You're using the anon key instead of service role key
- There's a permissions issue

Try:
1. Manually insert the migration record:
```sql
INSERT INTO schema_migrations (version, name) 
VALUES (20231215000001, '20231215000001_rename_location_to_address.sql');
```

2. Or use the service role key by setting `SUPABASE_SERVICE_ROLE_KEY`

## Rollback Procedures

**Note:** The current migration system doesn't support automatic rollbacks. For data safety, consider:

1. **Manual Rollback:** Run SQL to undo changes manually
2. **Backup First:** Always backup before running migrations
3. **Test First:** Test in development environment first

### Manual Rollback Example
If you need to undo the location→address migration:

```sql
-- Only if you kept a backup or the column still exists
ALTER TABLE profiles RENAME COLUMN address TO location;

-- Then remove from schema_migrations table
DELETE FROM schema_migrations 
WHERE name = '20231215000001_rename_location_to_address.sql';
```

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Your Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Public API key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Admin API key (recommended) | `eyJhbGc...` |

**Where to find these:**
1. Go to Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy the URLs and keys

## File Structure

```
scripts/
├── migrate.js                          # Migration runner script
├── migrations/
│   ├── 20231215000001_rename_location_to_address.sql
│   └── 20240101120000_example_migration.sql
├── activity-log.sql
├── clinic-permits.sql
├── seed-patient.js
└── ... other scripts
```

## CI/CD Integration

To run migrations automatically in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: npm run migrate
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Current Migrations

### 20231215000001: Rename location to address
- **File:** `scripts/migrations/20231215000001_rename_location_to_address.sql`
- **Purpose:** Aligns database schema with updated signup form fields
- **Changes:** 
  - Renames `profiles.location` → `profiles.address`
  - Safe: Checks if column exists before renaming
- **Status:** Pending (not yet run)

## Support

For issues or questions:
1. Check the Supabase documentation: https://supabase.com/docs/guides/cli/migration-commands
2. Review error messages in the migration output
3. Check your Supabase project's logs
4. Test migrations in development first

