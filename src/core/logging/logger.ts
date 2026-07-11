import type { LogLevel } from '../../domain/models'

export interface Logger {
  debug(message: string, context?: unknown): void
  info(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
  error(message: string, error?: unknown, context?: unknown): void
}

/** Sink tujuan log; logger utama hanya menyebarkan ke sink. (OCP) */
export interface LogSink {
  write(level: LogLevel, message: string, stack: string | null, context: string | null): void
}

function toContextString(context: unknown): string | null {
  if (context === undefined || context === null) return null
  try {
    return typeof context === 'string' ? context : JSON.stringify(context)
  } catch {
    return String(context)
  }
}

function toStack(error: unknown): string | null {
  if (error instanceof Error) return error.stack ?? error.message
  if (error === undefined || error === null) return null
  return String(error)
}

export class CompositeLogger implements Logger {
  constructor(private readonly sinks: LogSink[]) {}

  debug(message: string, context?: unknown): void {
    this.dispatch('debug', message, null, context)
  }

  info(message: string, context?: unknown): void {
    this.dispatch('info', message, null, context)
  }

  warn(message: string, context?: unknown): void {
    this.dispatch('warn', message, null, context)
  }

  error(message: string, error?: unknown, context?: unknown): void {
    this.dispatch('error', message, toStack(error), context)
  }

  private dispatch(
    level: LogLevel,
    message: string,
    stack: string | null,
    context?: unknown,
  ): void {
    const contextString = toContextString(context)
    for (const sink of this.sinks) {
      try {
        sink.write(level, message, stack, contextString)
      } catch {
        // Sink yang gagal tidak boleh mematikan aplikasi.
      }
    }
  }
}

export class ConsoleSink implements LogSink {
  write(level: LogLevel, message: string, stack: string | null, context: string | null): void {
    const parts = [`[ganbalog] ${message}`, context, stack].filter(Boolean)
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](...parts)
  }
}
