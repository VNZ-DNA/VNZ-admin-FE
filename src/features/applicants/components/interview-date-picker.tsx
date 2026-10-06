import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

type InterviewDatePickerProps = {
  value: string
  disabled: boolean
  invalid: boolean
  onChange: (value: string) => void
  onBlur: () => void
}

const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function getMonthDays(month: Date): Array<Date | null> {
  const year = month.getUTCFullYear()
  const monthIndex = month.getUTCMonth()
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const days: Array<Date | null> = Array.from({ length: firstWeekday }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(Date.UTC(year, monthIndex, day)))
  }

  while (days.length % 7 !== 0) days.push(null)
  return days
}

export function InterviewDatePicker({ value, disabled, invalid, onChange, onBlur }: InterviewDatePickerProps) {
  const selectedDate = parseIsoDate(value)
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = selectedDate ?? new Date()
    return new Date(Date.UTC(initialDate.getUTCFullYear(), initialDate.getUTCMonth(), 1))
  })
  const pickerRef = useRef<HTMLDivElement>(null)
  const days = useMemo(() => getMonthDays(visibleMonth), [visibleMonth])

  useEffect(() => {
    if (!selectedDate) return
    setVisibleMonth(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)))
  }, [value])

  useEffect(() => {
    if (!isOpen) return

    function closeWhenClickOutside(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeWhenClickOutside)
    return () => document.removeEventListener('pointerdown', closeWhenClickOutside)
  }, [isOpen])

  const monthLabel = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(visibleMonth)

  return (
    <div className="interview-date-picker" ref={pickerRef}>
      <input
        type="text"
        value={formatDate(value)}
        placeholder="DD/MM/YYYY"
        readOnly
        disabled={disabled}
        aria-invalid={invalid}
        aria-label="Ngày phỏng vấn"
        onClick={() => setIsOpen(true)}
        onBlur={onBlur}
      />
      <button
        className="interview-date-picker__trigger"
        type="button"
        disabled={disabled}
        aria-label="Mở lịch chọn ngày phỏng vấn"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Calendar size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="interview-date-picker__popover" role="dialog" aria-label="Chọn ngày phỏng vấn">
          <div className="interview-date-picker__header">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() => setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              aria-label="Tháng sau"
              onClick={() => setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="interview-date-picker__weekdays" aria-hidden="true">
            {weekDays.map((weekDay) => <span key={weekDay}>{weekDay}</span>)}
          </div>
          <div className="interview-date-picker__days">
            {days.map((date, index) =>
              date ? (
                <button
                  className={toIsoDate(date) === value ? 'is-selected' : ''}
                  type="button"
                  key={toIsoDate(date)}
                  onClick={() => {
                    onChange(toIsoDate(date))
                    setIsOpen(false)
                  }}
                >
                  {date.getUTCDate()}
                </button>
              ) : <span key={`blank-${index}`} />,
            )}
          </div>
        </div>
      )}
    </div>
  )
}
