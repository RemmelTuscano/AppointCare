export function isClinicPermitPath(path: string, clinicId: string) {
  const parts = path.split('/')
  if (parts.length !== 2 || !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(parts[1])) return false

  return parts[0] === clinicId
    || (parts[0] === 'permits' && parts[1].startsWith(`${clinicId}-`) && parts[1].length > clinicId.length + 1)
}
