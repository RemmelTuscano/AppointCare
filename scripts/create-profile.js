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

async function createProfile() {
  try {
    const userId = '9afa092d-63d0-42a2-9174-c80aa811b73b'

    console.log('📋 Creating profile for test patient user...')

    // Insert profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      role: 'patient',
      full_name: 'Test Patient',
      email: 'patient@appointcare.test',
      location: 'Test Location',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      if (profileError.message.includes('duplicate')) {
        console.log('✅ Profile already exists')
        return
      }
      throw profileError
    }

    console.log(`✅ Profile created successfully for user: ${userId}\n`)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createProfile()
