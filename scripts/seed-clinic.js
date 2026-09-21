#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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

async function seedClinic() {
  try {
    console.log('🌱 Creating seeded clinic account...')

    const email = 'clinic@appointcare.test'
    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Clinic@12345',
      email_confirm: true,
      user_metadata: {
        role: 'clinic',
        full_name: 'Test Clinic',
      },
    })

    const userAlreadyExists = authError?.message.toLowerCase().includes('already exists')
      || authError?.message.toLowerCase().includes('already been registered')
    if (authError && !userAlreadyExists) throw authError

    const authUser = createdUser?.user || await findUserByEmail(email)
    if (!authUser) throw new Error(`Could not find clinic account: ${email}`)

    console.log(`✅ Clinic account ready: ${authUser.id}`)

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUser.id,
      full_name: 'Test Clinic',
      email,
      role: 'clinic',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    const clinic = {
      user_id: authUser.id,
      name: 'Test Clinic',
      address: '123 Test Street',
      phone: '+1-555-0100',
      email,
      description: 'Test clinic for AppointCare demo',
      is_verified: true,
    }
    const { data: existingClinic, error: clinicLookupError } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', authUser.id)
      .limit(1)
      .maybeSingle()
    if (clinicLookupError) throw clinicLookupError

    const clinicResult = existingClinic
      ? await supabase.from('clinics').update(clinic).eq('id', existingClinic.id)
      : await supabase.from('clinics').insert(clinic)
    if (clinicResult.error) throw clinicResult.error

    console.log('✅ Clinic profile and clinic record repaired')

    console.log('\n📧 Login credentials:')
    console.log('   Email: clinic@appointcare.test')
    console.log('   Password: Clinic@12345\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seedClinic()
