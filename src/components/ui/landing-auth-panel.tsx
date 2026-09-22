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
      <div className={variant === 'header' ? 'flex items-center gap-3' : 'flex'} aria-label="Account actions">
        {variant === 'header' && (
          <button
            type="button"
            onClick={() => openPanel('login')}
            className="inline-flex px-2 py-2 text-sm font-medium text-white/85 transition hover:text-white sm:px-3"
          >
            Sign in
          </button>
        )}
        <button
          type="button"
          onClick={() => openPanel('signup')}
          className={variant === 'header'
            ? 'inline-flex items-center gap-2 rounded-md bg-[#d8f2d4] px-4 py-2.5 text-sm font-semibold text-[#174c40] transition hover:bg-white'
            : 'inline-flex items-center justify-center gap-2 rounded-md bg-[#b8e2b9] px-5 py-3.5 font-semibold text-[#174c40] transition hover:bg-[#d8f2d4]'}
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
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-[#f7fbf8] px-5 py-6 shadow-2xl sm:px-10 sm:py-10"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close account form"
                className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full text-[#27684e] transition hover:bg-[#dff0df]"
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