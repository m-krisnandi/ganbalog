import { format, parseISO, subDays } from 'date-fns'
import type { IsoDate } from '../../domain/models'

/** Hitung streak hari belajar berturut-turut hingga hari ini (inklusif). */
export function computeStudyStreak(activeDates: Set<IsoDate>, today: IsoDate): number {
  let streak = 0
  let cursor = parseISO(today)

  while (activeDates.has(format(cursor, 'yyyy-MM-dd') as IsoDate)) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return streak
}
