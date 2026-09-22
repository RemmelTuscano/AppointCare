import DashboardLayout from '@/components/ui/dashboard/layout'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
