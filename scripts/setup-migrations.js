#!/usr/bin/env node

/**
 * Manual Migration Setup
 * 
 * If you prefer to run migrations manually in Supabase SQL Editor,
 * this script will help you prepare the SQL.
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

console.log('\n📋 AppointCare Manual Migration Setup\n');
console.log('─'.repeat(60));
console.log('\nStep 1: Create the schema_migrations tracking table');
console.log('─'.repeat(60));
console.log('\nCopy and paste this SQL into your Supabase SQL Editor:\n');

const schemaSQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  version BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
ON schema_migrations(version);
`;

console.log(schemaSQL);

console.log('─'.repeat(60));
console.log('\nStep 2: Run the pending migrations\n');

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

migrations.forEach((migration, index) => {
  const filePath = path.join(migrationsDir, migration);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n### Migration ${index + 1}: ${migration}\n`);
  console.log('Copy and paste this SQL into your Supabase SQL Editor:\n');
  console.log(content);
  
  // Extract version from filename
  const version = parseInt(migration.split('_')[0]);
  
  console.log('\nThen run this to record the migration:\n');
  console.log(`INSERT INTO schema_migrations (version, name) VALUES (${version}, '${migration}');\n`);
  console.log('─'.repeat(60));
});

console.log('\n✓ All migrations prepared for manual execution\n');
console.log('Visit: https://app.supabase.com/project/YOUR_PROJECT/sql/new\n');
