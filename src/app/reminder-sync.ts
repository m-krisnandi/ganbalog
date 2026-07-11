export interface ReminderSyncPayload {
  enabled: boolean
  hour: number
  body: string
  title?: string
  lastStudyDate: string | null
}

export async function syncReminderToServiceWorker(payload: ReminderSyncPayload): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({ type: 'REMINDER_SYNC', payload })

    if (payload.enabled && 'periodicSync' in registration) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        })
        if (status.state === 'granted' || status.state === 'prompt') {
          await (
            registration as ServiceWorkerRegistration & {
              periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> }
            }
          ).periodicSync.register('study-reminder', { minInterval: 60 * 60 * 1000 })
        }
      } catch {
        // Unsupported or denied — foreground reminder still works.
      }
    }
  } catch {
    // SW not available (dev mode or unsupported browser).
  }
}

export async function pingReminderCheck(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({ type: 'CHECK_REMINDER' })
  } catch {
    // ignore
  }
}
