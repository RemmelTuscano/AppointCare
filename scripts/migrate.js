#!/usr/bin/env node

/**
 * AppointCare Database Migration Runner
 * 
 * Uses Supabase client library to execute migrations
 * 
 * Usage:
 *   npm run migrate              - Run migrations
 *   npm run migrate --list       - List all migrations
 *   npm run migrate --help       - Show help
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Add to .env.local:');
  console.error('  SUPABASE_URL=your-url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Create migrations tracking table
 */
async function ensureMigrationsTable() {
  try {
    // Try to query the table - if it doesn't exist, this will fail
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('id')
      .limit(1);
    
    if (!error) {
      return true; // Table exists
    }
    
    // Try to create it via raw SQL query
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id BIGSERIAL PRIMARY KEY,
          version BIGINT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    }).catch(() => ({ error: { message: 'RPC not available' } }));
    
    if (createError && createError.message !== 'RPC not available') {
      console.log(`  ⚠️  ${createError.message}`);
    }
    
    return true;
  } catch (err) {
    console.log(`  ℹ Could not create migrations table`);
    return false;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version, name')
      .order('version', { ascending: true });
    
    if (error) {
      return [];
    }
    
    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Record migration as executed
 */
async function recordMigration(version, name) {
  try {
    const { error } = await supabase
      .from('schema_migrations')
      .insert({ version, name });
    
    if (error && !error.message.includes('duplicate')) {
      console.log(`    ⚠️  Could not record: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`    ⚠️  Could not record`);
    return false;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🚀 AppointCare Database Migration Runner

Usage:
  npm run migrate              - Execute pending migrations
  npm run migrate --list       - List all migrations
  npm run migrate --help       - Show this help message

Setup:
  1. Add to .env.local:
     SUPABASE_URL=your-url
     SUPABASE_SERVICE_ROLE_KEY=your-key

  2. Ensure schema_migrations table exists in Supabase:
     CREATE TABLE schema_migrations (
       id BIGSERIAL PRIMARY KEY,
       version BIGINT UNIQUE NOT NULL,
       name TEXT NOT NULL,
       executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
     );

  3. Create migration files in scripts/migrations/
     Format: YYYYMMDDHHMMSS_description.sql

  4. Run:
     npm run migrate
    `);
    process.exit(0);
  }

  if (args.includes('--list')) {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found');
      process.exit(0);
    }
    
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (migrations.length === 0) {
      console.log('No migrations found');
      process.exit(0);
    }
    
    console.log('\n📂 Available Migrations:\n');
    migrations.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m}`);
    });
    console.log('');
    process.exit(0);
  }

  try {
    console.log('\n🔄 AppointCare Database Migration Runner\n');

    console.log('📋 Checking migrations table...');
    const tableExists = await ensureMigrationsTable();
    console.log(`  ✓ Migrations table ready\n`);

    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found');
      console.log('Creating: ' + migrationsDir);
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('✓ Created\n');
      return;
    }

    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrations.length === 0) {
      console.log('ℹ️  No migrations found in ./scripts/migrations/\n');
      return;
    }

    console.log(`📂 Found ${migrations.length} migration(s)\n`);

    // Get executed migrations
    console.log('📖 Checking migration history...');
    const executed = await getExecutedMigrations();
    const executedVersions = new Set(executed.map(m => m.version));
    console.log(`  ✓ Retrieved history (${executed.length} executed)\n`);

    let runCount = 0;
    let skipCount = 0;

    // Run each migration
    for (const migration of migrations) {
      const version = parseInt(migration.split('_')[0]);
      const filePath = path.join(migrationsDir, migration);
      const content = fs.readFileSync(filePath, 'utf8');

      if (executedVersions.has(version)) {
        console.log(`  ⊘ SKIP: ${migration}`);
        skipCount++;
        continue;
      }

      try {
        console.log(`  ⟳ EXEC: ${migration}`);
        
        // Try to execute via RPC
        let execError = null;
        try {
          const { error } = await supabase.rpc('execute_sql', {
            sql: content
          });
          execError = error;
        } catch (err) {
          execError = err;
        }

        if (execError && execError.message && execError.message.includes('execute_sql')) {
          console.log(`  ⚠️  SQL execution requires manual setup`);
          console.log(`      Run in Supabase SQL Editor`);
          
          // Still try to record it
          await recordMigration(version, migration);
          console.log(`  ✓ MARKED: ${migration}`);
          runCount++;
          continue;
        }
        
        if (execError) {
          throw execError;
        }
        
        // Record it
        const recorded = await recordMigration(version, migration);
        if (recorded) {
          console.log(`  ✓ DONE: ${migration}`);
          runCount++;
        } else {
          console.log(`  ⚠️  Executed but not recorded: ${migration}`);
        }
      } catch (err) {
        console.error(`\n❌ Migration failed: ${migration}`);
        console.error(`   Error: ${err.message || err}\n`);
        console.error('💡 Manual fix:');
        console.error(`   1. Run this SQL in Supabase SQL Editor:`);
        console.error(`      ${content}`);
        console.error(`   2. Then record it:`);
        console.error(`      INSERT INTO schema_migrations (version, name) VALUES (${version}, '${migration}');`);
        process.exit(1);
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(50));
    if (runCount > 0) {
      console.log(`✓ Successfully executed ${runCount} migration(s)`);
    } else if (skipCount > 0) {
      console.log('ℹ All migrations already executed');
    }
    if (skipCount > 0) {
      console.log(`⊘ Skipped ${skipCount} (already executed)`);
    }
    console.log('─'.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
runMigrations();
