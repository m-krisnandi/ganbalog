import type { Logger } from './logger'

/** Tangkap error yang lolos dari React (async, event handler, promise). */
export function installGlobalErrorHandlers(logger: Logger): void {
  window.addEventListener('error', (event) => {
    logger.error('Uncaught error', event.error ?? event.message, {
      source: event.filename,
      line: event.lineno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason)
  })
}
