'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  mode?: 'single'
  selected?: Date
  onSelect?: (date?: Date) => void
  disabled?: (date: Date) => boolean
  className?: string
}

export function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  const [displayedMonth, setDisplayedMonth] = React.useState(() => startOfMonth(selected ?? new Date()))

  const days = getCalendarDays(displayedMonth)
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(displayedMonth)

  return (
    <div className={`w-full max-w-sm p-3 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setDisplayedMonth((month) => addMonths(month, -1))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus:ring-3 focus:ring-emerald-100"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-emerald-950" aria-live="polite">{monthLabel}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setDisplayedMonth((month) => addMonths(month, 1))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus:ring-3 focus:ring-emerald-100"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="size-10" aria-hidden="true" />

          const isSelected = selected?.toDateString() === day.toDateString()
          const isDisabled = disabled ? disabled(day) : false
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              aria-label={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(day)}
              aria-pressed={isSelected}
              onClick={() => {
                if (!isDisabled) {
                  setDisplayedMonth(startOfMonth(day))
                  onSelect?.(day)
                }
              }}
              className={[
                'size-10 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-3 focus:ring-emerald-100',
                isSelected ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-950',
                isDisabled ? 'cursor-not-allowed text-gray-300 opacity-60 hover:bg-transparent hover:text-gray-300' : '',
              ].join(' ')}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days: Array<Date | undefined> = Array(firstDay.getDay()).fill(undefined)

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day))
  }

  while (days.length % 7 !== 0) days.push(undefined)
  return days
}
