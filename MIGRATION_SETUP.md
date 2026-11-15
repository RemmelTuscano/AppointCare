# 🚀 AppointCare Migration System - Setup Guide

## ✅ Status: Your Migration System is Ready!

The migration system is now working! You just need to complete the one-time setup below.

---

## Step 1: Create the Migrations Tracking Table

You need to create a `schema_migrations` table in your Supabase database to track which migrations have been run.

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project: **https://supabase.com/dashboard**
2. Select your project: **appointcare**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  version BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
ON schema_migrations(version);
```

6. Click **Run**
7. You should see: `Query succeeded! No rows returned`

---

## Step 2: Run the Migration

Once the table is created, run:

```bash
npm run migrate
```

You should see:

```
🔄 AppointCare Database Migration Runner

📋 Checking migrations table...
  ✓ Migrations table ready

📂 Found 1 migration(s)

📖 Checking migration history...
  ✓ Retrieved history (0 executed)

  ⟳ EXEC: 20231215000001_rename_location_to_address.sql
  ✓ DONE: 20231215000001_rename_location_to_address.sql

──────────────────────────────────────────────────
✓ Successfully executed 1 migration(s)
──────────────────────────────────────────────────
```

---

## What the Migration Does

The pending migration `20231215000001_rename_location_to_address.sql`:

- Renames the `location` column to `address` in the `profiles` table
- Updates the form fields to match the database
- Is safe: checks if the column exists before renaming

---

## Verification

After running the migration, verify it worked:

1. In Supabase SQL Editor, run:

```sql
SELECT * FROM schema_migrations;
```

You should see:

```
| id | version        | name                                          | executed_at              |
|----|----------------|-----------------------------------------------|--------------------------|
| 1  | 20231215000001 | 20231215000001_rename_location_to_address.sql | 2024-XX-XX XX:XX:XX+00  |
```

2. Check the profiles table:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='profiles' AND column_name IN ('location', 'address');
```

You should see the `address` column (not `location`).

---

## Troubleshooting

### "Migration failed: Could not find table 'schema_migrations'"

**Fix**: The tracking table hasn't been created yet. Follow Step 1 above.

### "Error: supabase.rpc execute_sql not available"

**Manual Option**: If the RPC method isn't available on your Supabase setup:

1. Get the migration SQL:
```bash
cat scripts/migrations/20231215000001_rename_location_to_address.sql
```

2. Run it manually in Supabase SQL Editor

3. Record it:
```bash
node scripts/migrate.js --manual-record
```

---

## Common Commands

```bash
# Run all pending migrations
npm run migrate

# List all available migrations
npm run migrate --list

# Show help
npm run migrate --help
```

---

## What's Next?

Your database is now synced with your form changes:

- ✅ Patient signup form uses "Fullname" (was "Username")
- ✅ Patient signup form uses "Address" (was "Location")
- ✅ Database column renamed from `location` to `address`

You can now:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Test the signup form at: **http://localhost:3000/signup**

3. Verify new signups save to the correct `address` column

---

## Adding More Migrations

To create new migrations:

1. Create a file in `scripts/migrations/` with format:
   ```
   YYYYMMDDHHMMSS_description.sql
   ```
   
   Example:
   ```
   20240115143022_create_audit_log.sql
   ```

2. Write your SQL in the file

3. Run:
   ```bash
   npm run migrate
   ```

The system automatically:
- Discovers new migrations
- Executes them in order
- Tracks execution in the `schema_migrations` table
- Skips already-executed migrations

---

## 📚 Documentation

- **This file**: `MIGRATION_SETUP.md` (setup instructions)
- **Commands**: Run `npm run migrate --help`
- **List migrations**: Run `npm run migrate --list`

---

**Status**: ✅ Ready to go!

After Step 1 is complete, your system will be fully operational.
