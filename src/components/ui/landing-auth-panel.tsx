'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import LoginPage from '@/app/(auth)/login/page'
import SignupPage from '@/app/(auth)/signup/page'

type AuthMode = 'login' | 'signup'

export function LandingAuthPanel({ variant = 'header' }: { variant?: 'header' | 'cta' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('signup')

  const openPanel = (nextMode: AuthMode) => {
    setMode(nextMode)
    setIsOpen(true)
  }

  return (
    <>
      <div className={variant === 'header' ? 'flex shrink-0 items-center gap-1 sm:gap-3' : 'flex'} aria-label="Account actions">
        {variant === 'header' && (
          <button
            type="button"
            onClick={() => openPanel('login')}
            className="inline-flex shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
          >
            Sign in
          </button>
        )}
        <button
          type="button"
          onClick={() => openPanel('signup')}
          className={variant === 'header'
            ? 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#e8cf82] px-2.5 py-2.5 text-xs font-bold text-[#183d3b] shadow-sm transition hover:-translate-y-px hover:bg-[#f0dda0] hover:shadow-md sm:gap-2 sm:px-4 sm:text-sm'
            : 'inline-flex items-center justify-center gap-2 rounded-md bg-[#e8cf82] px-5 py-3.5 font-bold text-[#183d3b] shadow-sm transition hover:-translate-y-px hover:bg-[#f0dda0] hover:shadow-md'}
        >
          {variant === 'header' ? 'Get started' : 'Create your account'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close account form"
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-[#0d3a30]/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={mode === 'login' ? 'Sign in to AppointCare' : 'Create an AppointCare account'}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[#c8dfca] bg-[#f4f8f4] px-5 py-6 shadow-2xl sm:px-10 sm:py-10"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close account form"
                className="absolute right-5 top-5 grid size-10 place-items-center rounded-md text-[#27684e] transition hover:bg-[#e1ebe3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27684e]"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto max-w-md pt-8">
                {mode === 'login' ? (
                  <LoginPage onSwitchToSignup={() => setMode('signup')} />
                ) : (
                  <SignupPage onSwitchToLogin={() => setMode('login')} />
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}