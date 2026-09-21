import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    const systemPrompt = `You are AppointCare AI, a helpful assistant for a medical appointment system. 
    You help patients and clinics with:
    - Booking and managing appointments
    - Finding available doctors and clinics
    - General health system navigation
    - Answering questions about the platform
    
    Be concise, professional, and friendly. If asked about specific medical advice, remind users to consult their doctor.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 500,
    })

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
