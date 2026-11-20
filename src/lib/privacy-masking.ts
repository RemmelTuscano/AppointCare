export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''

  const atIndex = email.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === email.length - 1) return '********'

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  const visibleLength = Math.min(3, Math.max(0, localPart.length - 1))
  const hiddenLength = Math.max(4, localPart.length - visibleLength)

  return `${localPart.slice(0, visibleLength)}${'*'.repeat(hiddenLength)}@${domain}`
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''

  const digitCount = phone.match(/\d/g)?.length || 0
  if (digitCount <= 4) return phone.replace(/\d/g, '*')

  let visibleDigits = 4
  return phone.replace(/\d/g, (digit) => {
    if (visibleDigits > 0) {
      visibleDigits--
      return digit
    }
    return '*'
  })
}
