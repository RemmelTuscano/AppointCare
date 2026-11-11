'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

const CLINIC_LINK = /\[([^\]\n]{1,80})\]\((\/patient\/clinics(?:\?clinic=[0-9a-f-]{36})?)\)/gi

function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const match of content.matchAll(CLINIC_LINK)) {
    if (match.index > last) parts.push(content.slice(last, match.index))
    parts.push(
      <Link key={match.index} href={match[2]} className="font-semibold text-[#27684e] underline underline-offset-2 hover:text-[#174c40]">
        {match[1]}
      </Link>
    )
    last = match.index + match[0].length
  }
  parts.push(content.slice(last))
  return <span className="whitespace-pre-wrap">{parts}</span>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const initialMessage: Message = {
  role: 'assistant',
  content: 'Hello! I\'m your AppointCare assistant. How can I help you today?',
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([initialMessage])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dragAreaRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (suggestedMessage?: string) => {
    const userMessage = (suggestedMessage ?? input).trim()
    if (!userMessage || loading) return

    setInput('')
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ])
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('The assistant response could not be read.')

      const decoder = new TextDecoder()
      let reply = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        reply += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map((msg, index) =>
          index === assistantMessageIndex ? { ...msg, content: reply } : msg
        ))
      }
      reply += decoder.decode()
      setMessages(prev => prev.map((msg, index) =>
        index === assistantMessageIndex
          ? { ...msg, content: reply || 'I apologize, but I\'m having trouble responding right now.' }
          : msg
      ))
    } catch (error) {
      setMessages(prev => prev.map((msg, index) =>
        index === assistantMessageIndex
          ? {
              ...msg,
              content: error instanceof Error
                ? error.message
                : 'Sorry, there was an error processing your request.',
            }
          : msg
      ))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div ref={dragAreaRef} className="pointer-events-none fixed inset-0 z-40" />
      {/* Floating Button */}
      <motion.button
        drag
        dragConstraints={dragAreaRef}
        dragElastic={0.12}
        dragMomentum={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AppointCare AI assistant' : 'Open AppointCare AI assistant'}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full bg-[#27684e] text-white shadow-[0_10px_30px_rgba(23,76,64,0.3)] ring-4 ring-[#fafffa] transition-colors hover:bg-[#174c40]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 z-50 flex h-[min(620px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#c8dfca] bg-[#fafffa] shadow-[0_24px_70px_rgba(23,76,64,0.2)] sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-[#174c40] p-4 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b8e2b9] text-[#174c40]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">AppointCare AI</h3>
                <p className="text-xs text-emerald-100/75">Clinic and appointment support</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessages([initialMessage])
                  setInput('')
                }}
                aria-label="Start a new AI chat"
                title="New chat"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AppointCare AI chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7fbf8] p-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dff0df]">
                      <Bot className="h-4 w-4 text-[#27684e]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-none bg-[#27684e] text-white'
                        : 'rounded-bl-none border border-[#d8e8da] bg-white text-[#24483d] shadow-sm'
                    }`}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d8e8da]">
                      <User className="h-4 w-4 text-[#27684e]" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dff0df]">
                    <Bot className="h-4 w-4 text-[#27684e]" />
                  </div>
                  <div className="rounded-2xl rounded-bl-none border border-[#d8e8da] bg-white p-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-[#80a98d]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-[#80a98d] delay-100" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-[#80a98d] delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-[#d8e8da] bg-[#fafffa] px-4 pb-3 pt-2">
              {[
                ['Suggest a clinic', 'Suggest the best available clinic for me. Ask for my location, preferred specialty, and preferred timing if needed.'],
                ['How to book', 'How do I book, reschedule, or cancel an appointment?'],
                ['Time slots', 'What appointment time slots are available?'],
                ['What to bring', 'What documents should I bring to my visit?'],
                ['Running late', 'What should I do if I am running late for my appointment?'],
                ['Fees & payment', 'How much is a consultation and what payment methods are accepted?'],
                ['Reminders', 'How do I get appointment reminders and notifications?'],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { void sendMessage(prompt) }}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-[#9dccaa] bg-[#eaf5e9] px-3 py-1.5 text-xs font-medium text-[#27684e] transition hover:bg-[#dff0df] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-[#d8e8da] bg-[#eaf5e9] p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border-[#c8dfca] bg-white focus-visible:ring-[#4f9a6d]"
                />
                <Button 
                  size="icon" 
                  className="bg-[#27684e] text-white hover:bg-[#174c40]"
                  onClick={() => { void sendMessage() }}
                  disabled={loading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-[#4b6b58]">For guidance only, not medical advice. Confirm details with the clinic. In an emergency, call your local emergency number.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}