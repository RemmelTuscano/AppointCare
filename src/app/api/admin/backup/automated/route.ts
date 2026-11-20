import { runAutomatedAdminBackup } from '@/lib/admin-backup-automation'

export async function GET(request: Request) {
  return runAutomatedAdminBackup(request)
}
