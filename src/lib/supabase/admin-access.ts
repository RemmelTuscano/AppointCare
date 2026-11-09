import 'server-only'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function requireAdminClient() {
  const sessionClient = await createClient()
  if (!sessionClient) throw new Error('Authentication is not configured.')

  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user) redirect('/login')
  if (user.app_metadata.role !== 'admin') redirect('/')

  const admin = createAdminClient()
  if (!admin) throw new Error('Database service is not configured.')
  return admin
}
