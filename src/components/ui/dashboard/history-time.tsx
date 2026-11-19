'use client'

import { format } from 'date-fns'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

export function HistoryTime({ value }: { value: string }) {
  const formatted = useSyncExternalStore(
    subscribe,
    () => format(new Date(value), 'PPp'),
    () => `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value))} UTC`,
  )
  return <time dateTime={value}>{formatted}</time>
}
