import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { useAuth } from '../../app/auth/AuthProvider'

export function OfflineBanner() {
  const { t } = useTranslation()
  const { cloudEnabled } = useAuth()
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!cloudEnabled || online) return null

  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <WifiOff size={16} className="shrink-0" aria-hidden />
      <p>{t('common.offline')}</p>
    </div>
  )
}
