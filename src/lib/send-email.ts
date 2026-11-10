import 'server-only'
import { Resend } from 'resend'

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || apiKey.startsWith('your_') || apiKey.includes('placeholder') || apiKey === 're_123456789') {
    return { sent: false, error: 'RESEND_API_KEY is not configured.' }
  }
  if (!from) return { sent: false, error: 'RESEND_FROM_EMAIL is not configured.' }

  try {
    const { data, error } = await new Resend(apiKey).emails.send({ from, to, subject, html })
    if (error) return { sent: false, error: error.message }
    if (!data?.id) return { sent: false, error: 'Resend did not confirm the email request.' }
    return { sent: true }
  } catch (error) {
    console.error('Resend email request failed:', error)
    return { sent: false, error: 'Resend request failed. Check the server logs.' }
  }
}
