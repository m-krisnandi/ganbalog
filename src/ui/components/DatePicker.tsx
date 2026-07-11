import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import type { IsoDate } from '../../domain/models'
import { dateLocale } from '../../app/i18n'
import { useServices } from '../../core/di/ServicesProvider'

interface DatePickerProps {
  value: IsoDate | ''
  onChange: (value: IsoDate | '') => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const { clock } = useServices()
  const locale = dateLocale(i18n.language)

  const [open, setOpen] = useState(false)
  const todayIso = clock.todayIso()
  const today = useMemo(() => parseISO(todayIso), [todayIso])

  const [viewMonth, setViewMonth] = useState(() =>
    value ? parseISO(value) : today,
  )

  useEffect(() => {
    if (value) setViewMonth(parseISO(value))
  }, [value])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  })

  const weekdayLabels = useMemo(() => {
    const monday = parseISO('2026-08-03')
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'EEEEE', { locale }))
  }, [locale])

  const display = value
    ? format(parseISO(value), 'd MMMM yyyy', { locale })
    : t('datePicker.placeholder')

  const pick = (iso: IsoDate) => {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-colors dark:bg-zinc-800 ${
          open
            ? 'border-accent ring-2 ring-accent/20'
            : 'border-zinc-200 dark:border-zinc-700'
        }`}
      >
        <span className={value ? 'font-medium' : 'text-zinc-400'}>{display}</span>
        <Calendar size={18} className="shrink-0 text-zinc-400" aria-hidden />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              role="dialog"
              aria-label={t('datePicker.placeholder')}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/80"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  aria-label={t('datePicker.prevMonth')}
                  className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className="text-sm font-semibold">
                  {format(viewMonth, 'MMMM yyyy', { locale })}
                </p>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  aria-label={t('datePicker.nextMonth')}
                  className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((label) => (
                  <span
                    key={label}
                    className="py-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase"
                  >
                    {label}
                  </span>
                ))}
                {days.map((day) => {
                  const iso = format(day, 'yyyy-MM-dd') as IsoDate
                  const inMonth = isSameMonth(day, viewMonth)
                  const selected = value ? isSameDay(day, parseISO(value)) : false
                  const isToday = isSameDay(day, today)

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => pick(iso)}
                      aria-label={format(day, 'd MMMM yyyy', { locale })}
                      aria-pressed={selected}
                      className={`relative flex size-9 items-center justify-center rounded-full text-sm transition-colors ${
                        selected
                          ? 'bg-accent font-semibold text-white'
                          : inMonth
                            ? 'text-zinc-800 hover:bg-white dark:text-zinc-100 dark:hover:bg-zinc-700'
                            : 'text-zinc-300 hover:bg-white/60 dark:text-zinc-600 dark:hover:bg-zinc-700/60'
                      } ${!selected && isToday ? 'ring-1 ring-accent/40 ring-inset' : ''}`}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayIso)
                    setViewMonth(today)
                    setOpen(false)
                  }}
                  className="flex-1 rounded-full py-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft dark:hover:bg-accent-soft-dark"
                >
                  {t('datePicker.today')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="flex-1 rounded-full py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  {t('datePicker.clear')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
