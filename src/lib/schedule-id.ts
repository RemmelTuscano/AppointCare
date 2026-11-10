export function formatScheduleId(appointmentId: string): string {
  if (!appointmentId) return 'SCH-00000000'
  const clean = appointmentId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `SCH-${clean.slice(0, 8)}`
}
