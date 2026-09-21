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

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email) || null
}

async function seedPatient() {
  try {
    console.log('🌱 Creating seeded patient account...')

    // Create the auth user
    const email = 'patient@appointcare.test'
    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'patient123',
      email_confirm: true,
      user_metadata: {
        role: 'patient',
        full_name: 'Test Patient',
      },
    })

    const userAlreadyExists = authError?.message.toLowerCase().includes('already exists')
      || authError?.message.toLowerCase().includes('already been registered')
    if (authError && !userAlreadyExists) throw authError

    const authUser = createdUser?.user || await findUserByEmail(email)
    if (!authUser) throw new Error(`Could not find patient account: ${email}`)

    console.log(`✅ Patient account ready: ${authUser.id}`)

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUser.id,
      full_name: 'Test Patient',
      email,
      role: 'patient',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    console.log('✅ Patient profile repaired')

    console.log('\n📧 Login credentials:')
    console.log('   Email: patient@appointcare.test')
    console.log('   Password: patient123\n')
    console.log('👉 Next: Set up your database tables in Supabase')
    console.log('   1. Go to https://app.supabase.com')
    console.log('   2. Select your project')
    console.log('   3. Go to SQL Editor')
    console.log('   4. Copy & paste the schema from src/lib/supabase/supabase/schema.sql\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seedPatient()
