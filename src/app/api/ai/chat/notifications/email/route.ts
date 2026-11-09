import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Direct email sending is not available.' }, { status: 410 })
}
