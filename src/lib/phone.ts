export function normalizePhilippineMobileNumber(value: string): string | null {
  if (/^09[0-9]{9}$/.test(value)) return `+63${value.slice(1)}`
  if (/^\+639[0-9]{9}$/.test(value)) return value
  return null
}
