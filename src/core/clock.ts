import { format } from 'date-fns'
import type { IsoDate, IsoStamp } from '../domain/models'

/** Abstraksi waktu supaya service deterministik & mudah dites. */
export interface Clock {
  now(): Date
  todayIso(): IsoDate
  stamp(): IsoStamp
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }

  todayIso(): IsoDate {
    return format(this.now(), 'yyyy-MM-dd')
  }

  stamp(): IsoStamp {
    return this.now().toISOString()
  }
}
