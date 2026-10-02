import Link from 'next/link'
import {
  BellRing,
  CalendarDays,
  Check,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { LandingAuthPanel } from '@/components/ui/landing-auth-panel'

const features = [
  {
    icon: CalendarDays,
    title: 'One calm calendar',
    description: 'See availability, bookings, and follow-ups in one clear view that works for patients and clinics.',
  },
  {
    icon: BellRing,
    title: 'Timely reminders',
    description: 'Keep every visit moving with appointment notifications that arrive when they are useful.',
  },
  {
    icon: ShieldCheck,
    title: 'Care with confidence',
    description: 'Role-based spaces give patients and care teams the information they need, and no more.',
  },
]

const careSteps = ['Find the right clinic', 'Choose a time that works', 'Stay on top of every visit']

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f7f4] text-[#173b32]">
      <section className="relative min-h-[calc(100svh-10rem)] overflow-hidden bg-[#173f3d] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: "url('/appointcare-hero.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-[#123b3b]/65" />

        <div className="relative mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-[1600px] flex-col px-4 pb-5 pt-5 sm:px-6 lg:px-12 lg:py-8">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 font-semibold text-white" aria-label="AppointCare home">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#b8e2b9] text-[#174c40]">
                <HeartPulse className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="text-xl">AppointCare</span>
            </Link>
            <LandingAuthPanel />
          </header>

          <div className="flex flex-1 items-center py-14 lg:py-20">
            <div className="w-full">
              <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                <div className="mb-6 inline-flex items-center gap-2 border border-[#e8cf82]/40 bg-[#153b39]/75 px-3 py-1.5 text-sm text-[#f1d989] backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" /> Better appointments, from first click to follow-up
                </div>
                <h1 className="max-w-xl font-heading text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">AppointCare.</h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-white/80 sm:text-xl">
                  A simpler way for people and clinics to find time for care, manage visits, and stay connected.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <LandingAuthPanel variant="cta" />
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/35 px-5 py-3.5 font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10"
                  >
                    See how it works <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#e8cf82]" /> For patients and clinics</span>
                  <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#e8cf82]" /> Designed around real schedules</span>
                </div>
              </div>
            </div>
          </div>

          <a href="#features" className="self-center text-sm font-medium text-white/70 transition hover:text-white">Explore AppointCare</a>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-[1600px] px-6 py-20 lg:px-12 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-[#397b6c]">Built for the rhythm of care</p>
          <h2 className="mt-3 font-heading text-3xl font-medium leading-tight sm:text-4xl">Less coordination. More attention where it matters.</h2>
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="border-t-2 border-[#9dccaa] pt-6">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-[#e4edcf] text-[#55733c]"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 font-heading text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-7 text-[#587269]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#e1d8bc] bg-[#f4efdf]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase text-[#8a6c2f]">A clearer care journey</p>
            <h2 className="mt-3 font-heading text-3xl font-medium leading-tight sm:text-4xl">Everything you need to make the next appointment easy.</h2>
            <LandingAuthPanel variant="cta" />
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {careSteps.map((step, index) => (
              <li key={step} className="border border-[#e1d8bc] bg-[#fffdf7] p-5">
                <span className="text-sm font-bold text-[#8a6c2f]">0{index + 1}</span>
                <p className="mt-10 font-heading text-lg font-semibold leading-6">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1600px] px-6 py-20 lg:px-12">
        <div className="flex flex-col justify-between gap-8 border-l-4 border-[#4f9a6d] bg-white px-7 py-8 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-[#397b6c]"><UsersRound className="h-5 w-5" /><span className="text-sm font-bold uppercase">Your care, coordinated</span></div>
              <h2 className="mt-3 font-heading text-2xl font-semibold">Ready to make appointments feel lighter?</h2>
          </div>
          <LandingAuthPanel variant="cta" />
        </div>
      </section>

      <footer className="border-t border-[#d8e8da] px-6 py-7 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-3 text-sm text-[#587269] sm:flex-row">
          <span>AppointCare</span>
          <span>Care scheduling for people and clinics.</span>
        </div>
      </footer>
    </main>
  )
}
