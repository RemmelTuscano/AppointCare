import { createAdminClient } from '@/lib/supabase/admin'

type ActivityInput = {
  actorId?: string | null
  action: string
  entityType: 'appointment' | 'clinic' | 'profile' | 'doctor' | 'system'
  entityId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}

export async function recordActivity({ actorId, action, entityType, entityId, summary, metadata = {} }: ActivityInput) {
  const admin = createAdminClient()
  if (!admin) return

  const { error } = await admin.from('activity_logs').insert({
    actor_id: actorId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    summary,
    metadata,
  })

  if (error) console.error('Activity log insert failed:', error.message)
}
