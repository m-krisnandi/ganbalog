/* GanbaLog service worker extension — daily study reminders (background). */

const CACHE = 'ganbalog-reminder-v1'
const CONFIG_URL = '/__ganbalog__/reminder-config'
const SENT_URL_PREFIX = '/__ganbalog__/sent/'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => checkReminder()),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data) return

  if (data.type === 'REMINDER_SYNC') {
    event.waitUntil(
      persistConfig(data.payload).then(() => registerPeriodicIfNeeded(data.payload?.enabled)),
    )
  }

  if (data.type === 'CHECK_REMINDER') {
    event.waitUntil(checkReminder())
  }
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'study-reminder') {
    event.waitUntil(checkReminder())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})

async function persistConfig(payload) {
  const cache = await caches.open(CACHE)
  await cache.put(CONFIG_URL, new Response(JSON.stringify(payload)))
}

async function readConfig() {
  const cache = await caches.open(CACHE)
  const response = await cache.match(CONFIG_URL)
  if (!response) return null
  return response.json()
}

async function checkReminder() {
  const config = await readConfig()
  if (!config?.enabled) return

  const now = new Date()
  if (now.getHours() !== config.hour) return
  if (now.getMinutes() > 14) return

  const today = now.toISOString().slice(0, 10)
  if (config.lastStudyDate === today) return

  const cache = await caches.open(CACHE)
  const sentUrl = `${SENT_URL_PREFIX}${today}`
  if (await cache.match(sentUrl)) return

  await self.registration.showNotification(config.title || 'GanbaLog', {
    body: config.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: 'ganbalog-daily-reminder',
    renotify: false,
  })
  await cache.put(sentUrl, new Response('1'))
}

async function registerPeriodicIfNeeded(enabled) {
  if (!enabled) return
  try {
    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register('study-reminder', {
        minInterval: 60 * 60 * 1000,
      })
    }
  } catch {
    // Periodic Background Sync is optional (mainly Android Chrome).
  }
}
