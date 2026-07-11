import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDisplayStore } from '../../app/display'
import { pingReminderCheck, syncReminderToServiceWorker } from '../../app/reminder-sync'
import { useStudyLogs } from '../../app/queries'
import { useServices } from '../../core/di/ServicesProvider'

const REMINDER_KEY_PREFIX = 'ganbalog-reminder-sent:'

export function StudyReminder() {
  const { t } = useTranslation()
  const { reminderEnabled, reminderHour } = useDisplayStore()
  const { clock } = useServices()
  const { data: studyLogs = [] } = useStudyLogs()

  const today = clock.todayIso()
  const lastStudyDate =
    [...studyLogs].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null

  useEffect(() => {
    void syncReminderToServiceWorker({
      enabled: reminderEnabled,
      hour: reminderHour,
      body: t('settings.reminderBody'),
      title: 'GanbaLog',
      lastStudyDate: studyLogs.some((log) => log.date === today) ? today : lastStudyDate,
    })
  }, [lastStudyDate, reminderEnabled, reminderHour, studyLogs, t, today])

  useEffect(() => {
    if (!reminderEnabled || typeof Notification === 'undefined') return

    const check = () => {
      void pingReminderCheck()
      if (Notification.permission !== 'granted') return

      const now = new Date()
      if (now.getHours() !== reminderHour || now.getMinutes() !== 0) return

      const storageKey = `${REMINDER_KEY_PREFIX}${today}`
      if (sessionStorage.getItem(storageKey)) return

      const studiedToday = studyLogs.some((log) => log.date === today)
      if (studiedToday) return

      sessionStorage.setItem(storageKey, '1')
      new Notification('GanbaLog', { body: t('settings.reminderBody') })
    }

    check()
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, [reminderEnabled, reminderHour, studyLogs, t, today])

  return null
}
