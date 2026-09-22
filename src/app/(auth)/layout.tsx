'use client'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(187,247,208,0.6),transparent_35%),#f7fbf8] p-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}
