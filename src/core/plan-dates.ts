import { addMonths, format, parseISO } from 'date-fns'
import type { IsoDate } from '../domain/models'

/** Default tanggal plan baru: mulai hari ini, target ~6 bulan (tipikal prep ber-target). */
export function defaultNewPlanDates(todayIso: IsoDate): {
  startDate: IsoDate
  targetDate: IsoDate
} {
  const start = parseISO(todayIso)
  return {
    startDate: todayIso,
    targetDate: format(addMonths(start, 6), 'yyyy-MM-dd'),
  }
}
