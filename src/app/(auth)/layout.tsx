'use client'

import Link from 'next/link'
import { HeartPulse } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section
        className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#143f3e] px-6 py-6 text-white sm:min-h-[260px] lg:min-h-screen lg:px-12 lg:py-10"
        style={{ backgroundImage: "url('/appointcare-hero.jpg')", backgroundPosition: 'center 42%', backgroundSize: 'cover' }}
      >
        <div className="absolute inset-0 -z-10 bg-[#123b3b]/70" />
        <Link href="/" className="inline-flex w-fit items-center gap-3" aria-label="AppointCare home">
          <span className="grid size-11 place-items-center rounded-md bg-[#e8cf82] text-[#183d3b] shadow-lg">
            <HeartPulse className="size-5" strokeWidth={2.4} />
          </span>
          <span className="font-heading text-xl font-semibold">AppointCare</span>
        </Link>
        <div className="relative max-w-xl py-5 lg:pb-8">
          <p className="text-xs font-bold uppercase text-[#f1d989]">Care, in good company</p>
          <h1 className="mt-3 font-heading text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">Make space for what matters.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-base">A calmer way to stay close to every appointment and the people who make care happen.</p>
        </div>
      </section>
      <div className="flex min-h-[calc(100svh-220px)] items-center justify-center px-5 py-8 sm:px-8 lg:min-h-screen lg:px-10 lg:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </main>
  )
}
