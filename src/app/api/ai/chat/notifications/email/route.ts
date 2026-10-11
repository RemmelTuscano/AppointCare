import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 })
    }
    const resend = new Resend(apiKey)
    const { to, subject, html } = await req.json()

    const { data, error } = await resend.emails.send({
      from: 'AppointCare <appointments@yourdomain.com>',
      to,
      subject,
      html,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 },
    )
  }
}