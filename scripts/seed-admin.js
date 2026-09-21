#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}

envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) envVars[key.trim()] = valueParts.join('=').trim()
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email) || null
}

async function seedAdmin() {
  const email = 'admin@appointcare.test'
  const password = 'Admin@12345'
  const phone = '+15555550199'

  try {
    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'AppointCare Admin', phone },
    })

    const userAlreadyExists = authError?.message.toLowerCase().includes('already exists')
      || authError?.message.toLowerCase().includes('already been registered')
    if (authError && !userAlreadyExists) throw authError

    const authUser = createdUser?.user || await findUserByEmail(email)
    if (!authUser) throw new Error(`Could not find admin account: ${email}`)

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUser.id,
      full_name: 'AppointCare Admin',
      email,
      role: 'admin',
      phone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    console.log('Admin account ready.')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

seedAdmin()