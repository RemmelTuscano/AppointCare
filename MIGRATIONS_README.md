# 🗄️ Database Migrations for AppointCare

## Quick Start (30 seconds)

### 1. Add Environment Variables
Edit `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Create Schema Tracking Table
Open **Supabase > SQL Editor** and run:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  version BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Run Migrations
```bash
npm run migrate
```

Done! ✓

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:setup` | Show SQL for manual setup |
| `npm run migrate:list` | List all migrations and status |
| `npm run migrate:help` | Show detailed help |

---

## Three Ways to Run Migrations

### Option 1: Automatic (Recommended)
```bash
npm run migrate
```
✓ Runs pending migrations automatically  
✓ Records execution in database  
✓ Shows nice progress output

### Option 2: Manual Setup
```bash
npm run migrate:setup
```
Shows all SQL needed to run migrations manually in Supabase SQL Editor.

### Option 3: Direct SQL
Copy migration files from `scripts/migrations/` and run directly in Supabase SQL Editor.

---

## Current Migrations

### 📌 20231215000001: Rename location to address
**Status:** Ready to run  
**Purpose:** Align database schema with updated signup forms

```sql
-- Renames profiles.location → profiles.address
-- Safe: Checks if column exists first
```

**What changed:**
- Form field "Location" → "Address"  
- Database column `location` → `address`

---

## Creating New Migrations

### 1. Create File
Create in `scripts/migrations/` with format:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20240115100000_add_user_preferences.sql`

### 2. Write SQL
```sql
-- Migration: 20240115100000_add_user_preferences
-- Description: Add user preferences table

BEGIN;

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

COMMIT;
```

### 3. Run Migration
```bash
npm run migrate
```

---

## Migration Best Practices

### ✅ DO:
```sql
-- Use transactions
BEGIN;
  ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
COMMIT;

-- Check if column exists first
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
  END IF;
END $$;

-- Use descriptive names
ALTER TABLE clinics ADD COLUMN verification_status TEXT DEFAULT 'pending';

-- Add comments
COMMENT ON COLUMN clinics.verification_status IS 'Clinic verification status: pending, verified, rejected';

-- Create indexes for new columns
CREATE INDEX idx_clinics_verification_status ON clinics(verification_status);
```

### ❌ DON'T:
```sql
-- Don't drop tables without backup
DROP TABLE patients;  -- ❌ DANGEROUS!

-- Don't delete data
DELETE FROM appointments;  -- ❌ DATA LOSS!

-- Don't use non-idempotent operations
ALTER TABLE users ADD COLUMN name TEXT;  -- ❌ Will fail if column exists

-- Don't modify without checks
RENAME TABLE old_name TO new_name;  -- ❌ May break foreign keys
```

---

## Common Migration Patterns

### Add a Column
```sql
BEGIN;
ALTER TABLE profiles 
ADD COLUMN phone_verified BOOLEAN DEFAULT false;
COMMIT;
```

### Rename a Column
```sql
BEGIN;
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles RENAME COLUMN location TO address;
  END IF;
END $$;
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
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at 
ON appointments(created_at DESC);
COMMIT;
```

### Create a Table
```sql
BEGIN;
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
COMMIT;
```

---

## File Structure

```
scripts/
├── migrate.js                              # Feature-rich migration runner
├── migrate-simple.js                       # Simple migration runner (recommended)
├── setup-migrations.js                     # Manual setup helper
├── migrations/
│   ├── 20231215000001_rename_location_to_address.sql
│   └── [future migrations]
├── activity-log.sql
├── seed-patient.js
└── ... other scripts
```

---

## Environment Variables

Get these from **Supabase Dashboard > Settings > API**:

| Variable | Required | Where to Find |
|----------|----------|---|
| `SUPABASE_URL` | ✓ | Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | ✓ | Settings > API > Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | (optional) | Settings > API > Service Role Key |

---

## Troubleshooting

### ❌ "SUPABASE_URL is not set"
**Fix:** Add to `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
```

### ❌ "schema_migrations table does not exist"
**Fix:** Run in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  version BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### ❌ "Migration ran but didn't record"
**Fix:** Manually insert:
```sql
INSERT INTO schema_migrations (version, name) 
VALUES (20231215000001, '20231215000001_rename_location_to_address.sql');
```

### ❌ "Permission denied"
**Fix:** Use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY`

### ❌ "Syntax error in migration"
**Fix:** 
1. Test SQL in Supabase SQL Editor first
2. Check for missing semicolons
3. Verify column/table names are correct

---

## Backup Before Running Migrations

Always backup your database before running migrations in production:

1. Go to **Supabase Dashboard**
2. Navigate to **Backups**
3. Click **Create Backup**
4. Wait for backup to complete
5. Then run migrations

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Database Migration
on: [push]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Deploy with Migrations
```bash
# Build app
npm run build

# Run migrations
npm run migrate

# Start app
npm start
```

---

## Rollback Procedures

The simple migration system doesn't auto-rollback, but you can:

### Manual Rollback
Run undo SQL in Supabase SQL Editor:
```sql
-- Example: undo rename migration
ALTER TABLE profiles RENAME COLUMN address TO location;

-- Remove from tracking table
DELETE FROM schema_migrations 
WHERE name = '20231215000001_rename_location_to_address.sql';
```

### Database Restore
If something goes wrong:
1. Go to Supabase Dashboard
2. Click **Backups**
3. Select backup before migration
4. Click **Restore**
5. Wait for restore to complete

---

## Getting Help

**Resources:**
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- Check migration file comments for specific details

**For Issues:**
1. Run `npm run migrate:setup` to see exact SQL
2. Test SQL in Supabase SQL Editor
3. Check environment variables
4. Review error messages carefully

---

## Next Steps

1. ✓ Add environment variables to `.env.local`
2. ✓ Create `schema_migrations` table in Supabase
3. ✓ Run `npm run migrate`
4. ✓ Create new migrations as needed
5. ✓ Test in development before production

---

**Happy migrating! 🚀**

