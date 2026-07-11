import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { registerSW } from 'virtual:pwa-register'
import { useToastStore } from './toast-store'

/** Prompt when a new service worker is ready (production only). */
export function PwaUpdater() {
  const { t } = useTranslation()

  useEffect(() => {
    if (!import.meta.env.PROD) return

    const updateSW = registerSW({
      onNeedRefresh() {
        useToastStore.getState().show(t('pwa.updateAvailable'), 'success', {
          label: t('pwa.reload'),
          onAction: () => void updateSW(true),
        })
      },
      onOfflineReady() {
        useToastStore.getState().show(t('pwa.offlineReady'), 'success')
      },
    })
  }, [t])

  return null
}
