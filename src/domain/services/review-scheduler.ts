import { addDays, format, parseISO } from 'date-fns'
import type { IsoDate } from '../models'

/**
 * Kebijakan fukushū (復習): spaced repetition sederhana.
 * Interval fix +3/+7/+21 hari — sengaja tidak configurable di awal
 * supaya tidak ada keputusan yang membebani pengguna.
 */
export interface ReviewPolicy {
  reviewDates(completedOn: IsoDate): IsoDate[]
}

export class FixedIntervalReviewPolicy implements ReviewPolicy {
  constructor(private readonly intervalsDays: number[] = [3, 7, 21]) {}

  reviewDates(completedOn: IsoDate): IsoDate[] {
    const base = parseISO(completedOn)
    return this.intervalsDays.map((days) => format(addDays(base, days), 'yyyy-MM-dd'))
  }
}
