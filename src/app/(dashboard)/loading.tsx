export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-muted" />)}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
