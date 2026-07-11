import type { LogLevel } from '../../domain/models'
import type { LogRepository } from '../../domain/repositories'
import type { Clock } from '../clock'
import type { IdGenerator } from '../ids'
import type { LogSink } from './logger'

/**
 * Menyimpan log warn/error ke IndexedDB supaya bisa dilihat lagi dari
 * halaman Settings (berguna untuk debugging di HP tanpa devtools).
 */
export class PersistentSink implements LogSink {
  constructor(
    private readonly repository: LogRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  write(level: LogLevel, message: string, stack: string | null, context: string | null): void {
    if (level === 'debug' || level === 'info') return
    void this.repository
      .append({
        id: this.ids.next(),
        at: this.clock.stamp(),
        level,
        message,
        stack,
        context,
      })
      .catch(() => {
        // Kegagalan menulis log tidak boleh mengganggu aplikasi.
      })
  }
}
