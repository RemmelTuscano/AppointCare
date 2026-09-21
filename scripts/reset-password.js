#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}

envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetPassword() {
  try {
    const newPassword = 'Patient@12345'

    console.log('🔑 Resetting password for patient@appointcare.test...')

    const { data, error } = await supabase.auth.admin.updateUserById(
      '9afa092d-63d0-42a2-9174-c80aa811b73b', // The UID created earlier
      { password: newPassword }
    )

    if (error) {
      throw error
    }

    console.log(`✅ Password reset successfully!\n`)
    console.log('📧 Updated login credentials:')
    console.log('   Email: patient@appointcare.test')
    console.log(`   Password: ${newPassword}\n`)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

resetPassword()
