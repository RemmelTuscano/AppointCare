export function formatDoctorName(name: string | null | undefined, fallback: string): string {
  const withoutTitle = (name || '').trim().replace(/^(?:dr(?:\.\s*|\s+))+/i, '').trim()
  return withoutTitle ? `Dr. ${withoutTitle}` : fallback
}
